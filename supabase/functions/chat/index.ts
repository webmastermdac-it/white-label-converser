import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_MAP: Record<string, string> = {
  "gpt-4o-mini": "openai/gpt-5-mini",
  "gpt-4o": "openai/gpt-5",
};

type ResponseSource = "FAQ" | "KNOWLEDGE" | "INSTRUCTIONS";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, embed_token, session_token, source_url, language } = await req.json();
    const lang = language || "en";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Step 0: Fetch bot config ──
    const { data: botConfig, error: configError } = await supabase
      .from("chatbot_configs")
      .select("id, client_id, name, business_vertical, knowledge_base, fallback_message, fallback_msg_en, fallback_msg_it, welcome_msg_it, welcome_msg_en, knowledge_base_products, lead_form_mode, notification_email, email_notifications_enabled")
      .eq("embed_token", embed_token)
      .single();

    if (configError || !botConfig) {
      return jsonResp({ error: "Invalid embed token" }, 401);
    }

    // ── Parallel: client plan, session count, plan config ──
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [clientRes, sessionCountRes, planConfigRes] = await Promise.all([
      supabase.from("clients").select("plan").eq("id", botConfig.client_id).single(),
      supabase.from("chat_sessions").select("id", { count: "exact", head: true })
        .eq("client_id", botConfig.client_id).gte("started_at", monthStart.toISOString()),
      supabase.from("plan_configs")
        .select("plan_name, max_conversations_month, chat_model, knowledge_base_wizard"),
    ]);

    const plan = clientRes.data?.plan || "free";
    const planConfig = planConfigRes.data?.find((p: any) => p.plan_name === plan);
    const maxConv = planConfig?.max_conversations_month ?? 50;
    const chatModel = planConfig?.chat_model || "gpt-4o-mini";
    const ragAllowed = plan !== "free";

    // Check conversation limit
    if (maxConv !== -1 && (sessionCountRes.count || 0) >= maxConv) {
      return jsonResp({
        error: "plan_limit",
        message: "Monthly conversation limit reached. Upgrade to continue.",
        trigger_lead_form: true,
      }, 429);
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // ══════════════════════════════════════════════════════
    // STEP 1 — FAQ LOOKUP (highest priority)
    // ══════════════════════════════════════════════════════
    const faqResult = await lookupFaq(supabase, botConfig.id, lastUserMessage);
    if (faqResult) {
      console.log(`[chat] source: FAQ | question matched: "${faqResult.question}"`);
      const cleanAnswer = faqResult.answer;

      if (session_token) {
        saveSession(supabase, session_token, botConfig, [...messages, { role: "assistant", content: cleanAnswer }], source_url, lang);
      }

      return jsonResp({
        message: cleanAnswer,
        source: "FAQ" as ResponseSource,
        trigger_lead_form: false,
      });
    }

    // ══════════════════════════════════════════════════════
    // STEP 2 — KNOWLEDGE LOOKUP (RAG, medium priority)
    // ══════════════════════════════════════════════════════
    let ragContext = "";
    let responseSource: ResponseSource = "INSTRUCTIONS";

    if (ragAllowed) {
      try {
        const ragResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/rag-search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: lastUserMessage,
              chatbot_id: botConfig.id,
              match_count: 5,
              match_threshold: 0.6,
            }),
          }
        );
        if (ragResponse.ok) {
          const ragData = await ragResponse.json();
          if (ragData.chunks?.length > 0) {
            ragContext = "\n\n--- RELEVANT KNOWLEDGE BASE CONTEXT ---\n" +
              ragData.chunks.map((c: any, i: number) => {
                const urlLine = c.metadata?.url ? `\nPage link: ${c.metadata.url}` : "";
                return `[Source ${i + 1} (relevance: ${(c.similarity * 100).toFixed(0)}%)]${urlLine}\n${c.content}`;
              }).join("\n\n") +
              "\n--- END CONTEXT ---\n\nIMPORTANT: Use the above context to answer the user's question accurately. If the context contains the answer, use it. If not, use your general knowledge base instructions. If a Source you used to answer has a 'Page link', include that link at the end of your answer as a reference (e.g. 'Per saperne di più: <link>'). Never invent or guess a link that wasn't provided in the context. If no Source used has a link, don't mention any link.";
            responseSource = "KNOWLEDGE";
            console.log(`[chat] source: KNOWLEDGE | ${ragData.chunks.length} chunks found`);
          }
        }
      } catch (ragErr) {
        console.error("[chat] RAG search error (non-blocking):", ragErr);
      }
    }

    if (responseSource === "INSTRUCTIONS") {
      console.log("[chat] source: INSTRUCTIONS | using system prompt fallback");
    }

    // ══════════════════════════════════════════════════════
    // STEP 3 — INSTRUCTIONS FALLBACK (lowest priority)
    // Build system prompt and call AI
    // ══════════════════════════════════════════════════════
    const fallbackConcept = botConfig.fallback_msg_en || botConfig.fallback_message || "I don't have this information, but I can connect you with one of our consultants!";
    let productKnowledge = botConfig.knowledge_base_products || "";

    // ── Product search: retrieve the most relevant catalog items for this query ──
    let matchedProducts = "";
    try {
      matchedProducts = await searchProducts(supabase, botConfig.client_id, lastUserMessage);
    } catch (pErr) {
      console.error("[chat] product search error (non-blocking):", pErr);
    }
    if (matchedProducts) {
      console.log("[chat] product search: matches injected");
      productKnowledge = matchedProducts + (productKnowledge ? "\n\n" + productKnowledge : "");
    }

    const productInstruction = productKnowledge
      ? `\n\nYou have access to the store's updated product catalog (see PRODOTTI PIÙ RILEVANTI first, then the full catalog).\nWhen users ask about products you MUST use this catalog and always report, when available:\n- the exact product NAME\n- the PRICE (always with 2 decimals and currency)\n- the AVAILABILITY (in stock / out of stock, with quantity if present)\n- a short summary of the product DESCRIPTION\n- the CATEGORY the product belongs to\n- the product LINK if present\nAlso read technical attributes contained in the name or description (e.g. SPF/protection factor, volume in ml, ingredients, size, colour, skin type) and use them to advise the visitor: compare products on those attributes and explain the practical difference (for example: the higher the SPF, the stronger the sun protection — SPF 50 protects more than SPF 30).\nIf the exact requested product is missing, suggest the closest alternatives from the same category instead of saying you have no information.\nIf a product is out of stock, say so and propose similar available products.\nNever invent products, prices, availability or attributes that are not in the catalog.`
      : "";

    const languageInstruction = `\n\nIMPORTANT LANGUAGE RULE:\nThe visitor is using language code: ${lang}\nYou MUST always respond in the same language the visitor is writing in, regardless of the language of the knowledge base.\nAdapt naturally to any language the visitor uses.\nThe only exception: if the visitor explicitly asks you to switch to a different language, do so.`;

    const fallbackInstruction = `\n\nFALLBACK RULE:\nWhen you don't know the answer or are uncertain, you must:\n1. Write a fallback message in the SAME language the visitor is using.\n2. The concept to convey is: "${fallbackConcept}" — translate and adapt this naturally.\n3. After saying the fallback message, include the special marker: [TRIGGER_LEAD_FORM]\n4. Never make up information not provided in your knowledge base.\n5. Do NOT use the fallback when the product catalog contains relevant or similar products — answer with those instead.`;

    const formattingInstruction = `\n\nFORMATTING RULES:\n- Use **bold** only for product/plan names and prices\n- Use bullet lists only when listing 3+ items\n- Keep responses concise: max 6-8 lines per answer\n- No headers (##) in responses\n- End with ONE short question to keep the conversation going\n- Never use excessive formatting — write naturally`;

    const addToCartInstruction = productKnowledge
      ? `\n\nADD TO CART RULE:\nWhen a user wants to add a product to the cart, answer normally and append, on a separate final line, this marker with the exact product ID taken from the catalog (the "id" or "sku" field shown in the catalog):\n[ADD_TO_CART:{"product_id":"<exact external_id>","qty":<quantity>}]\nNever show this marker to the user, it is removed automatically.`
      : "";

    const orderStatusInstruction = `\n\nSe l'utente chiede lo stato di un ordine, chiedigli SEMPRE numero ordine ed email usata per l'acquisto (se non li ha già forniti entrambi in questo messaggio). Solo quando hai entrambi, includi alla fine del messaggio, su una riga a parte:\n[CHECK_ORDER:{"order_number":"<numero esatto>","email":"<email esatta>"}]\nNon mostrare mai questo marker all'utente, verrà rimosso automaticamente.\nSe il controllo non trova l'ordine, suggerisci di verificare i dati o di contattare l'assistenza.`;

    // ── Real purchase tools (only for ecommerce chatbots with a configured store) ──
    let ecommerceConfigured = false;
    let ecommerceStoreUrl = "";
    if (botConfig.business_vertical === "ecommerce") {
      const { data: ecomCfg } = await supabase
        .from("ecommerce_configs")
        .select("platform, store_url")
        .eq("client_id", botConfig.client_id)
        .maybeSingle();
      ecommerceConfigured = !!ecomCfg && ["woocommerce", "shopify", "prestashop"].includes(ecomCfg.platform);
      ecommerceStoreUrl = (ecomCfg?.store_url || "").replace(/\/$/, "");
    }

    const tools = ecommerceConfigured
      ? [
          {
            type: "function",
            function: {
              name: "create_real_checkout",
              description:
                "Crea un acquisto REALE sullo store del cliente e restituisce il link di checkout/pagamento. Usalo solo quando il visitatore vuole davvero comprare un prodotto del catalogo e hai raccolto almeno nome ed email. Non inventare mai il link.",
              parameters: {
                type: "object",
                properties: {
                  product_id: { type: "string", description: "external_id esatto del prodotto dal catalogo" },
                  quantity: { type: "number", description: "Quantità richiesta (default 1)" },
                  name: { type: "string", description: "Nome e cognome del cliente" },
                  email: { type: "string", description: "Email del cliente" },
                  phone: { type: "string", description: "Telefono del cliente, se fornito" },
                  address: { type: "string", description: "Indirizzo di spedizione, se fornito" },
                },
                required: ["product_id", "name", "email"],
              },
            },
          },
        ]
      : [];

    const purchaseInstruction = ecommerceConfigured
      ? `\n\nACQUISTO REALE:\nPuoi completare acquisti veri con il tool create_real_checkout.\nPrima di chiamarlo devi avere: prodotto (external_id dal catalogo), quantità, nome, email; chiedi anche telefono e indirizzo di spedizione quando possibile.\nChiama il tool una sola volta per acquisto, poi comunica al visitatore il link di checkout restituito per completare il pagamento sullo store.\nSe il tool restituisce success=false, spiega gentilmente che l'acquisto non è andato a buon fine e proponi di essere ricontattato, aggiungendo il marker [TRIGGER_LEAD_FORM].`
      : "";

    const purchaseRules = ecommerceConfigured
      ? `REGOLE OBBLIGATORIE SUGLI ACQUISTI (PRIORITÀ MASSIMA, prevalgono su ogni altra istruzione):\n1. Non hai la possibilità di aggiungere prodotti al carrello, avanzare un checkout o confermare pagamenti semplicemente parlandone. Puoi farlo SOLO chiamando il tool create_real_checkout.\n2. Non dire mai "ho aggiunto al carrello", "sto procedendo al checkout", "ordine confermato" o frasi simili se non hai appena ricevuto un risultato success:true dal tool.\n3. Se l'utente vuole comprare, prima raccogli in modo naturale i dati necessari (prodotto, quantità, nome, email, telefono, indirizzo), poi chiama create_real_checkout.\n4. Se il tool ritorna un errore, dillo chiaramente all'utente (es: "non riesco a creare il checkout in questo momento, puoi completare l'acquisto direttamente su ${ecommerceStoreUrl || "il nostro sito"} oppure riprova tra poco") — non inventare mai una soluzione alternativa che non hai verificato.\n5. Quando il tool ha successo, manda all'utente il checkout_url reale ricevuto, spiegando che lì può scegliere il metodo di pagamento che preferisce e completare l'acquisto in sicurezza.\n\n`
      : "";

    const instructions = botConfig.knowledge_base || "You are a helpful assistant.";
    const systemPrompt = `${purchaseRules}${instructions}${productKnowledge ? "\n\n" + productKnowledge : ""}${ragContext}\n\nIMPORTANT INSTRUCTIONS:\n- Be concise, helpful, and professional${languageInstruction}${fallbackInstruction}${productInstruction}${addToCartInstruction}${orderStatusInstruction}${purchaseInstruction}${formattingInstruction}`;


    // ── Call AI gateway (with tool-call loop) ──
    const gatewayModel = MODEL_MAP[chatModel] || "openai/gpt-5-mini";

    async function callAi(convo: any[]) {
      const payload: any = {
        model: gatewayModel,
        messages: [{ role: "system", content: systemPrompt }, ...convo],
        stream: false,
      };
      if (tools.length) payload.tools = tools;

      let res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Keep customer chatbots available if the workspace AI Gateway limit blocks usage
      // or the AI Gateway credit balance is exhausted.
      if (res.status === 402 || res.status === 403) {
        const openAiKey = Deno.env.get("OPENAI_API_KEY");
        if (openAiKey) {
          console.warn(`[chat] AI Gateway returned ${res.status}; using configured OpenAI fallback`);
          res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, model: chatModel === "gpt-4o" ? "gpt-4o" : "gpt-4o-mini" }),
          });
        }
      }
      return res;
    }

    async function runCheckoutTool(args: any) {
      try {
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-real-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embed_token, ...args }),
        });
        return await resp.json();
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    const convo: any[] = [...messages];
    let aiMessage: any = null;

    for (let step = 0; step < 3; step++) {
      const aiResponse = await callAi(convo);
      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) return jsonResp({ error: "Rate limit exceeded" }, 429);
        if (status === 402) return jsonResp({ error: "AI credits exhausted" }, 402);
        throw new Error(`AI gateway error: ${status}`);
      }
      const aiData = await aiResponse.json();
      aiMessage = aiData.choices?.[0]?.message || {};
      const toolCalls = aiMessage.tool_calls;
      if (!toolCalls?.length) break;

      convo.push(aiMessage);
      for (const call of toolCalls) {
        let args: any = {};
        try {
          args = JSON.parse(call.function?.arguments || "{}");
        } catch { /* ignore malformed args */ }
        let result: any = { success: false, error: "Tool non disponibile." };
        if (call.function?.name === "create_real_checkout") {
          result = await runCheckoutTool(args);
          console.log(`[chat] tool create_real_checkout → success=${result.success}`);
        }
        convo.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    const fullMessage = aiMessage?.content || "";


    // ── Add-to-cart marker → real store cart link ──
    let cartLinkMarkdown = "";
    const addToCartMatch = fullMessage.match(/\[ADD_TO_CART:(\{.*?\})\]/);
    if (addToCartMatch) {
      try {
        const { product_id, qty } = JSON.parse(addToCartMatch[1]);
        const quantity = qty || 1;

        const { data: ecommerceConfig } = await supabase
          .from("ecommerce_configs")
          .select("platform, store_url")
          .eq("client_id", botConfig.client_id)
          .maybeSingle();

        const { data: product } = await supabase
          .from("products")
          .select("external_id, product_url, variants")
          .eq("client_id", botConfig.client_id)
          .eq("external_id", String(product_id))
          .maybeSingle();

        if (ecommerceConfig && product) {
          const storeUrl = (ecommerceConfig.store_url || "").replace(/\/$/, "");
          let cartUrl = "";

          if (ecommerceConfig.platform === "woocommerce") {
            cartUrl = `${storeUrl}/?add-to-cart=${encodeURIComponent(product.external_id)}&quantity=${quantity}`;
          } else if (ecommerceConfig.platform === "shopify") {
            const variantId = (product.variants as any[])?.[0]?.id;
            if (variantId) {
              cartUrl = `${storeUrl}/cart/${variantId}:${quantity}`;
            } else if (product.product_url) {
              cartUrl = product.product_url;
            }
          } else if (product.product_url) {
            // PrestaShop / feed / custom API: no reliable auto add-to-cart, link the product page
            cartUrl = product.product_url;
          }

          if (cartUrl) {
            const label =
              ecommerceConfig.platform === "woocommerce" || ecommerceConfig.platform === "shopify"
                ? "Aggiungi al carrello"
                : "Vai al prodotto";
            cartLinkMarkdown = `\n\n[🛒 ${label}](${cartUrl})`;
          }
        }
      } catch (e) {
        console.error("[chat] add_to_cart error:", e);
      }
    }

    // ── Order status marker → verified order lookup ──
    let orderStatusText = "";
    const checkOrderMatch = fullMessage.match(/\[CHECK_ORDER:(\{.*?\})\]/);
    if (checkOrderMatch) {
      try {
        const { order_number, email } = JSON.parse(checkOrderMatch[1]);
        const statusResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/get-order-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embed_token, order_number, email }),
        });
        const statusData = await statusResp.json();
        if (statusData.found) {
          const dateStr = statusData.order_date ? new Date(statusData.order_date).toLocaleDateString("it-IT") : "";
          orderStatusText = `\n\n📦 **Stato ordine #${order_number}**: ${statusData.status}${dateStr ? ` (ordinato il ${dateStr})` : ""}`;
        } else {
          orderStatusText = `\n\nNon ho trovato nessun ordine con numero "${order_number}" e questa email. Verifica i dati e riprova.`;
        }
      } catch (e) {
        console.error("[chat] check_order error:", e);
        orderStatusText = "\n\nSi è verificato un errore nel controllo dell'ordine, riprova tra poco.";
      }
    }

    const cleanMessage =
      fullMessage
        .replace("[TRIGGER_LEAD_FORM]", "")
        .replace(/\[ADD_TO_CART:.*?\]/g, "")
        .replace(/\[CHECK_ORDER:.*?\]/g, "")
        .trim() + cartLinkMarkdown + orderStatusText;
    const triggerLead = fullMessage.indexOf("[TRIGGER_LEAD_FORM]") !== -1;

    // Save session in background
    if (session_token) {
      saveSession(supabase, session_token, botConfig, [...messages, { role: "assistant", content: cleanMessage }], source_url, lang);
    }

    return jsonResp({
      message: cleanMessage,
      source: responseSource,
      trigger_lead_form: triggerLead,
    });


  } catch (error: any) {
    console.error("chat error:", error);
    return jsonResp({ error: error.message }, 500);
  }
});

// ══════════════════════════════════════════════════════
// FAQ LOOKUP — exact match then fuzzy (similarity > 0.85)
// ══════════════════════════════════════════════════════
async function lookupFaq(
  supabase: any,
  chatbotId: string,
  userMessage: string
): Promise<{ question: string; answer: string } | null> {
  const { data: faqs, error } = await supabase
    .from("faqs")
    .select("question, answer")
    .eq("chatbot_id", chatbotId);

  if (error || !faqs?.length) return null;

  const normalizedQuery = userMessage.toLowerCase().trim();

  // Pass 1: Exact match (case-insensitive)
  for (const faq of faqs) {
    if (faq.question.toLowerCase().trim() === normalizedQuery) {
      return faq;
    }
  }

  // Pass 2: Fuzzy match using word overlap similarity
  let bestMatch: { question: string; answer: string } | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const score = wordSimilarity(normalizedQuery, faq.question.toLowerCase().trim());
    if (score > 0.85 && score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return bestMatch;
}

function wordSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

// ══════════════════════════════════════════════════════
// PRODUCT SEARCH — keyword scoring over the synced catalog
// ══════════════════════════════════════════════════════
const STOPWORDS = new Set([
  "the","and","for","with","che","con","per","del","della","dei","delle","una","uno","gli","hai","avete","vorrei","cerco","quanto","costa","prezzo","price","have","какой",
  "sono","questo","questa","quale","quali","mi","puoi","potete","info","informazioni","about","tell","dimmi","voglio","vorresti","disponibile","disponibilità",
]);

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

async function searchProducts(supabase: any, clientId: string, query: string): Promise<string> {
  const terms = tokenize(query);
  if (!terms.length) return "";

  const { data: products, error } = await supabase
    .from("products")
    .select("name, description, price, sale_price, currency, in_stock, stock_quantity, categories, tags, variants, product_url")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .limit(1500);

  if (error || !products?.length) return "";

  const scored = products.map((p: any) => {
    const nameTokens = new Set(tokenize(p.name));
    const catTokens = new Set(tokenize([...(p.categories || []), ...(p.tags || [])].join(" ")));
    const descTokens = new Set(tokenize(p.description));

    let score = 0;
    for (const t of terms) {
      if (nameTokens.has(t)) score += 5;
      else if (catTokens.has(t)) score += 3;
      else if (descTokens.has(t)) score += 1.5;
      else if ((p.name || "").toLowerCase().includes(t)) score += 2;
    }
    if (p.in_stock) score += 0.5;
    return { p, score };
  }).filter((r: any) => r.score > 0);

  if (!scored.length) return "";

  scored.sort((a: any, b: any) => b.score - a.score);
  const top = scored.slice(0, 8);

  const fmt = (n: any) => Number(n ?? 0).toFixed(2);
  let text = `## PRODOTTI PIÙ RILEVANTI PER LA RICHIESTA DEL VISITATORE\n\n`;
  for (const { p } of top) {
    const cur = p.currency || "EUR";
    text += `**${p.name}**\n`;
    text += `- Categoria: ${(p.categories || []).join(" > ") || "n/d"}\n`;
    text += `- Prezzo: ${cur === "EUR" ? "€" : cur + " "}${fmt(p.sale_price ?? p.price)}`;
    if (p.sale_price) text += ` (invece di ${cur === "EUR" ? "€" : cur + " "}${fmt(p.price)}, in offerta)`;
    text += "\n";
    text += `- Disponibilità: ${p.in_stock ? `disponibile${p.stock_quantity != null && p.stock_quantity > 0 ? ` (${p.stock_quantity} pz)` : ""}` : "esaurito"}\n`;
    if (p.description) text += `- Descrizione: ${String(p.description).slice(0, 900)}\n`;
    if (p.tags?.length) text += `- Tag: ${p.tags.slice(0, 10).join(", ")}\n`;
    if (Array.isArray(p.variants) && p.variants.length) {
      text += `- Varianti: ${p.variants.slice(0, 8).map((v: any) => `${v.name || v.value || ""}${v.price != null ? ` (${fmt(v.price)})` : ""}`).join(", ")}\n`;
    }
    if (p.product_url) text += `- Link: ${p.product_url}\n`;
    text += "\n";
  }
  return text;
}

function jsonResp(data: any, status = 200) {

  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function saveSession(
  supabase: any, session_token: string, botConfig: any,
  allMessages: any[], source_url: string | undefined, lang: string
) {
  try {
    const { data: existingSession } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("session_token", session_token)
      .single();

    if (existingSession) {
      await supabase.from("chat_sessions").update({
        messages: allMessages,
        ended_at: null,
        last_message_at: new Date().toISOString(),
        language: lang,
      }).eq("session_token", session_token);
    } else {
      await supabase.from("chat_sessions").insert({
        client_id: botConfig.client_id,
        bot_id: botConfig.id,
        messages: allMessages,
        session_token,
        source_url: source_url || "",
        language: lang,
        last_message_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Session save error (non-blocking):", err);
  }
}
