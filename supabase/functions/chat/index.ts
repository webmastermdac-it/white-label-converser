import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchBrandSettings, newLeadEmail, newLeadSubject, fetchCustomTemplate,
  renderCustomTemplate, replaceSubjectVars, resolveClientOwnerLocale,
} from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_MAP: Record<string, string> = {
  "gpt-4o-mini": "openai/gpt-5-mini",
  "gpt-4o": "openai/gpt-5",
};

type ResponseSource = "FAQ_DIRECT" | "FAQ_SEMANTIC" | "KNOWLEDGE" | "INSTRUCTIONS";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const tStart = Date.now();

  try {
    const { messages, embed_token, session_token, source_url, language, stream, room } = await req.json();
    const lang = language || "en";
    const safeRoom = typeof room === "string" ? room.trim().slice(0, 40) : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Step 0: Fetch bot config ──
    const { data: botConfig, error: configError } = await supabase
      .from("chatbot_configs")
      .select("id, client_id, name, business_vertical, knowledge_base, fallback_message, fallback_msg_en, fallback_msg_it, welcome_msg_it, welcome_msg_en, knowledge_base_products, lead_form_mode, notification_email, email_notifications_enabled, hotel_profile")
      .eq("embed_token", embed_token)
      .single();

    if (configError || !botConfig) {
      return jsonResp({ error: "Invalid embed token" }, 401);
    }

    console.log(`[chat] ⏱ fetch config: ${Date.now() - tStart}ms`);

    // ── Parallel: FAQ lookup, client plan, session count, plan config ──
    // NOTE: FAQ is only EXECUTED earlier here; its PRIORITY in the answer is unchanged.
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const tParallel = Date.now();

    const [faqContextResult, clientRes, sessionCountRes, planConfigRes] = await Promise.all([
      (async () => {
        const s = Date.now();
        const r = await buildFaqContext(supabase, botConfig.id, lastUserMessage);
        console.log(`[chat] ⏱ FAQ lookup: ${Date.now() - s}ms`);
        return r;
      })(),
      supabase.from("clients").select("plan").eq("id", botConfig.client_id).single(),
      supabase.from("chat_sessions").select("id", { count: "exact", head: true })
        .eq("client_id", botConfig.client_id).gte("started_at", monthStart.toISOString()),
      getPlanConfigs(supabase),
    ]);
    console.log(`[chat] ⏱ parallel block (FAQ + client + sessions + plan_configs): ${Date.now() - tParallel}ms`);

    const plan = clientRes.data?.plan || "free";
    const planConfig = planConfigRes.data?.find((p: any) => p.plan_name === plan);
    const maxConv = planConfig?.max_conversations_month ?? 50;
    const chatModel = planConfig?.chat_model || "gpt-4o-mini";
    const ragAllowed = plan !== "free";

    // ── Conversational lead capture: has this session already produced a lead? ──
    const conversationalLead = (botConfig as any).lead_form_mode === "conversational" && !(botConfig.business_vertical === "hotel" && safeRoom);
    let leadAlreadyCaptured = false;
    if (conversationalLead && session_token) {
      const { data: sessionRow } = await supabase
        .from("chat_sessions")
        .select("lead_captured")
        .eq("session_token", session_token)
        .maybeSingle();
      leadAlreadyCaptured = !!sessionRow?.lead_captured;
    }

    // Check conversation limit
    if (maxConv !== -1 && (sessionCountRes.count || 0) >= maxConv) {
      return jsonResp({
        error: "plan_limit",
        message: "Monthly conversation limit reached. Upgrade to continue.",
        trigger_lead_form: true,
      }, 429);
    }

    // ══════════════════════════════════════════════════════
    // STEP 1 — FAQ CONTEXT (highest priority, injected in the system prompt)
    // ══════════════════════════════════════════════════════
    const faqContext = faqContextResult?.block || "";
    const faqSource = faqContextResult?.source || null;
    if (faqSource) console.log(`[chat] FAQ context injected | mode: ${faqSource}`);

    // ══════════════════════════════════════════════════════
    // STEP 2 — KNOWLEDGE LOOKUP (RAG, medium priority) + pages index + products
    // RAG now runs INLINE (no HTTP hop to the rag-search function)
    // ══════════════════════════════════════════════════════
    let ragContext = "";
    let responseSource: ResponseSource = "INSTRUCTIONS";

    const tLookups = Date.now();
    const [ragChunks, pagesIndex, matchedProducts] = await Promise.all([
      (async () => {
        if (!ragAllowed) return [] as any[];
        const s = Date.now();
        try {
          const chunks = await searchKnowledgeChunks(supabase, botConfig.id, lastUserMessage);
          console.log(`[chat] ⏱ RAG (inline): ${Date.now() - s}ms | ${chunks.length} chunks`);
          return chunks;
        } catch (ragErr) {
          console.error("[chat] RAG search error (non-blocking):", ragErr);
          console.log(`[chat] ⏱ RAG (inline, failed): ${Date.now() - s}ms`);
          return [] as any[];
        }
      })(),
      buildPagesIndex(supabase, botConfig.id),
      (async () => {
        try {
          return await searchProducts(supabase, botConfig.client_id, lastUserMessage);
        } catch (pErr) {
          console.error("[chat] product search error (non-blocking):", pErr);
          return "";
        }
      })(),
    ]);
    console.log(`[chat] ⏱ lookups (RAG + pages index + products): ${Date.now() - tLookups}ms`);

    if (ragChunks.length > 0) {
      ragContext = "\n\n--- RELEVANT KNOWLEDGE BASE CONTEXT ---\n" +
        ragChunks.map((c: any, i: number) => {
          const urlLine = c.metadata?.url ? `\nPage link: ${c.metadata.url}` : "";
          return `[Source ${i + 1} (relevance: ${(c.similarity * 100).toFixed(0)}%)]${urlLine}\n${c.content}`;
        }).join("\n\n") +
        "\n--- END CONTEXT ---\n\nIMPORTANT: Use the above context to answer the user's question accurately. If the context contains the answer, use it. If not, use your general knowledge base instructions. If a Source you used to answer has a 'Page link', include that link at the end of your answer as a reference (e.g. 'Per saperne di più: <link>'). Never invent or guess a link that wasn't provided in the context. If no Source used has a link, don't mention any link.";
      responseSource = "KNOWLEDGE";
      console.log(`[chat] source: KNOWLEDGE | ${ragChunks.length} chunks found`);
    } else {
      console.log("[chat] source: INSTRUCTIONS | using system prompt fallback");
    }

    const pagesIndexInstruction = pagesIndex
      ? `\n\nUse the AVAILABLE PAGES INDEX above ONLY when the user explicitly asks for a full list/overview/index of everything available (e.g. "what courses do you have", "list everything", "show me all your pages") — in that case, list the relevant entries with their links. For specific content questions, keep using the RAG context block, not this index. Never invent entries not present in this index.`
      : "";

    // ══════════════════════════════════════════════════════
    // STEP 3 — INSTRUCTIONS FALLBACK (lowest priority)
    // Build system prompt and call AI
    // ══════════════════════════════════════════════════════
    const fallbackConcept = botConfig.fallback_msg_en || botConfig.fallback_message || "I don't have this information, but I can connect you with one of our consultants!";
    let productKnowledge = botConfig.knowledge_base_products || "";

    if (matchedProducts) {
      console.log("[chat] product search: matches injected");
      productKnowledge = matchedProducts + (productKnowledge ? "\n\n" + productKnowledge : "");
    }

    const productInstruction = productKnowledge
      ? `\n\nYou have access to the store's updated product catalog (see PRODOTTI PIÙ RILEVANTI first, then the full catalog).\nWhen users ask about products you MUST use this catalog and always report, when available:\n- the exact product NAME\n- the PRICE (always with 2 decimals and currency)\n- the AVAILABILITY (in stock / out of stock, with quantity if present)\n- a short summary of the product DESCRIPTION\n- the CATEGORY the product belongs to\n- the product LINK if present\nAlso read technical attributes contained in the name or description (e.g. SPF/protection factor, volume in ml, ingredients, size, colour, skin type) and use them to advise the visitor: compare products on those attributes and explain the practical difference (for example: the higher the SPF, the stronger the sun protection — SPF 50 protects more than SPF 30).\nIf the exact requested product is missing, suggest the closest alternatives from the same category instead of saying you have no information.\nIf a product is out of stock, say so and propose similar available products.\nNever invent products, prices, availability or attributes that are not in the catalog.`
      : "";

    const languageInstruction = `\n\nIMPORTANT LANGUAGE RULE:\nThe visitor is using language code: ${lang}\nYou MUST always respond in the same language the visitor is writing in, regardless of the language of the knowledge base.\nAdapt naturally to any language the visitor uses.\nThe only exception: if the visitor explicitly asks you to switch to a different language, do so.`;

    const fallbackInstruction = conversationalLead
      ? `\n\nFALLBACK RULE:\nWhen you don't know the answer or are uncertain, you must:\n1. Write a fallback message in the SAME language the visitor is using.\n2. The concept to convey is: "${fallbackConcept}" — translate and adapt this naturally.\n3. Never make up information not provided in your knowledge base.\n4. Do NOT use the fallback when the product catalog contains relevant or similar products — answer with those instead.\n5. Never use any [TRIGGER_LEAD_FORM] marker.`
      : `\n\nFALLBACK RULE:\nWhen you don't know the answer or are uncertain, you must:\n1. Write a fallback message in the SAME language the visitor is using.\n2. The concept to convey is: "${fallbackConcept}" — translate and adapt this naturally.\n3. After saying the fallback message, include the special marker: [TRIGGER_LEAD_FORM]\n4. Never make up information not provided in your knowledge base.\n5. Do NOT use the fallback when the product catalog contains relevant or similar products — answer with those instead.`;

    // ── Conversational lead-capture instructions (only for lead_form_mode = "conversational") ──
    const conversationalLeadInstruction = !conversationalLead
      ? ""
      : leadAlreadyCaptured
      ? `\n\nCONTACT DATA RULE:\nYou already collected this visitor's contact details in this conversation. Do NOT ask for their name, email or phone again. Never output [LEAD_DATA:...] or [TRIGGER_LEAD_FORM] again in this session. Just keep helping them naturally.`
      : `\n\nCONVERSATIONAL CONTACT COLLECTION (MANDATORY, HIGHEST PRIORITY):\nWhile helping the visitor, collect their contact details naturally inside the conversation — never show or describe a form, and never list several fields at once.\n1. First ask only for their name (one short question, woven naturally into your reply).\n2. Once you know their name, ask for ONE contact: their email (or phone if they prefer). One question at a time.\n3. Never invent contact information the visitor did not actually give you.\n4. CHECK BEFORE EVERY REPLY: if the visitor has already provided a name AND at least one of email or phone anywhere in this conversation, you MUST append the hidden marker below as the very last line of that reply. This is not optional — omitting it is an error.\n[LEAD_DATA:{"name":"...","email":"...","phone":"...","message":"short summary of what they want"}]\nRules for the marker: valid JSON on its own final line, empty string for email or phone if not provided, emitted exactly once in the whole conversation. Keep the visible part of the reply completely natural (e.g. "Grazie Marco! Ti ricontatteremo a marco@email.it a breve.") with no form and no mention of the marker — it is stripped automatically and the visitor never sees it.`;

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
      ? `\n\nACQUISTO REALE:\nPuoi completare acquisti veri con il tool create_real_checkout.\nPrima di chiamarlo devi avere: prodotto (external_id dal catalogo), quantità, nome, email; chiedi anche telefono e indirizzo di spedizione quando possibile.\nChiama il tool una sola volta per acquisto, poi comunica al visitatore il link di checkout restituito per completare il pagamento sullo store.\nSe il tool restituisce success=false, spiega gentilmente che l'acquisto non è andato a buon fine e proponi di essere ricontattato${conversationalLead ? "." : ", aggiungendo il marker [TRIGGER_LEAD_FORM]."}`
      : "";

    const purchaseRules = ecommerceConfigured
      ? `REGOLE OBBLIGATORIE SUGLI ACQUISTI (PRIORITÀ MASSIMA, prevalgono su ogni altra istruzione):\n1. Non hai la possibilità di aggiungere prodotti al carrello, avanzare un checkout o confermare pagamenti semplicemente parlandone. Puoi farlo SOLO chiamando il tool create_real_checkout.\n2. Non dire mai "ho aggiunto al carrello", "sto procedendo al checkout", "ordine confermato" o frasi simili se non hai appena ricevuto un risultato success:true dal tool.\n3. Se l'utente vuole comprare, prima raccogli in modo naturale i dati necessari (prodotto, quantità, nome, email, telefono, indirizzo), poi chiama create_real_checkout.\n4. Se il tool ritorna un errore, dillo chiaramente all'utente (es: "non riesco a creare il checkout in questo momento, puoi completare l'acquisto direttamente su ${ecommerceStoreUrl || "il nostro sito"} oppure riprova tra poco") — non inventare mai una soluzione alternativa che non hai verificato.\n5. Quando il tool ha successo, manda all'utente il checkout_url reale ricevuto, spiegando che lì può scegliere il metodo di pagamento che preferisce e completare l'acquisto in sicurezza.\n\n`
      : "";

    // ── Hotel concierge (only for business_vertical = "hotel") ──
    const hotelContext = botConfig.business_vertical === "hotel"
      ? buildHotelContext((botConfig as any).hotel_profile, conversationalLead, safeRoom)
      : "";

    const instructions = botConfig.knowledge_base || "You are a helpful assistant.";
    const systemPrompt = `${faqContext}${purchaseRules}${instructions}${hotelContext}${productKnowledge ? "\n\n" + productKnowledge : ""}${ragContext}${pagesIndex}\n\nIMPORTANT INSTRUCTIONS:\n- Be concise, helpful, and professional${languageInstruction}${fallbackInstruction}${conversationalLeadInstruction}${productInstruction}${addToCartInstruction}${orderStatusInstruction}${purchaseInstruction}${formattingInstruction}${pagesIndexInstruction}`;


    // ── Call AI gateway (with tool-call loop) ──
    const gatewayModel = MODEL_MAP[chatModel] || "openai/gpt-5-mini";

    // Streaming is used when the caller can consume SSE (the widget can) and no tools
    // are configured — tool calls still need the full non-streamed message.
    const clientWantsStream =
      stream !== false && !String(source_url || "").startsWith("instagram://");
    const useStream = clientWantsStream && tools.length === 0;

    async function callAi(convo: any[], streaming: boolean) {
      const payload: any = {
        model: gatewayModel,
        messages: [{ role: "system", content: systemPrompt }, ...convo],
        stream: streaming,
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

    // ── Markers post-processing (identical for streaming and non-streaming) ──
    const stripMarkers = (text: string) =>
      text
        .replace("[TRIGGER_LEAD_FORM]", "")
        .replace(/\[LEAD_DATA:\{[\s\S]*?\}\]/g, "")
        .replace(/\[ADD_TO_CART:.*?\]/g, "")
        .replace(/\[CHECK_ORDER:.*?\]/g, "");

    async function postProcess(fullMessage: string) {
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
            .eq("client_id", (botConfig as any).client_id)
            .maybeSingle();

          const { data: product } = await supabase
            .from("products")
            .select("external_id, product_url, variants")
            .eq("client_id", (botConfig as any).client_id)
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

      // ── Conversational lead marker → create the lead automatically ──
      if (conversationalLead && !leadAlreadyCaptured) {
        const leadDataMatch = fullMessage.match(/\[LEAD_DATA:(\{.*?\})\]/);
        if (leadDataMatch) {
          try {
            const parsed = JSON.parse(leadDataMatch[1]);
            const lName = String(parsed.name || "").trim();
            const lEmail = String(parsed.email || "").trim();
            const lPhone = String(parsed.phone || "").trim();
            if (lName && (lEmail || lPhone)) {
              await createConversationalLead(supabase, botConfig, {
                name: lName,
                email: lEmail,
                phone: lPhone,
                message: String(parsed.message || "").trim(),
                transcript: messages,
                source_url,
                lang,
              });
              leadAlreadyCaptured = true;
              console.log("[chat] conversational lead captured");
            }
          } catch (e) {
            console.error("[chat] LEAD_DATA parse error:", e);
          }
        }
      }

      const cleanMessage = stripMarkers(fullMessage).trim() + cartLinkMarkdown + orderStatusText;
      const triggerLead = !conversationalLead && fullMessage.indexOf("[TRIGGER_LEAD_FORM]") !== -1;

      // Save session in background
      if (session_token) {
        saveSession(supabase, session_token, botConfig, [...messages, { role: "assistant", content: cleanMessage }], source_url, lang, conversationalLead && leadAlreadyCaptured);
      }

      return { cleanMessage, triggerLead };
    }

    // ══════════════════════════════════════════════════════
    // STREAMING PATH (Server-Sent Events, OpenAI delta format)
    // ══════════════════════════════════════════════════════
    if (useStream) {
      const tAi = Date.now();
      const aiResponse = await callAi([...messages], true);
      console.log(`[chat] ⏱ AI call (first byte, streaming): ${Date.now() - tAi}ms`);

      if (!aiResponse.ok || !aiResponse.body) {
        const status = aiResponse.status;
        if (status === 429) return jsonResp({ error: "Rate limit exceeded" }, 429);
        if (status === 402) return jsonResp({ error: "AI credits exhausted" }, 402);
        throw new Error(`AI gateway error: ${status}`);
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const upstream = aiResponse.body.getReader();

      const sseChunk = (text: string) =>
        encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);

      const body = new ReadableStream({
        async start(controller) {
          let acc = "";       // raw accumulated model output
          let sent = "";      // text already forwarded to the client
          let buf = "";

          const flush = () => {
            // Never forward a partially written marker: hold back from the last "["
            const clean = stripMarkers(acc).replace(/^\s+/, "");
            const openIdx = clean.lastIndexOf("[");
            const safe = openIdx !== -1 && clean.indexOf("]", openIdx) === -1
              ? clean.slice(0, openIdx)
              : clean;
            if (safe.length > sent.length && safe.startsWith(sent)) {
              const delta = safe.slice(sent.length);
              sent = safe;
              controller.enqueue(sseChunk(delta));
            }
          };

          try {
            while (true) {
              const { done, value } = await upstream.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const parts = buf.split("\n");
              buf = parts.pop() || "";
              for (const raw of parts) {
                const line = raw.trim();
                if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    acc += delta;
                    flush();
                  }
                } catch { /* ignore keep-alive / partial frames */ }
              }
            }

            console.log(`[chat] ⏱ AI call (stream complete): ${Date.now() - tAi}ms`);

            const { cleanMessage } = await postProcess(acc);
            if (cleanMessage.startsWith(sent)) {
              const tail = cleanMessage.slice(sent.length);
              if (tail) controller.enqueue(sseChunk(tail));
            } else {
              controller.enqueue(sseChunk(cleanMessage.slice(stripMarkers(acc).trim().length)));
            }
            // Preserve the lead-form trigger: the widget detects this marker in the stream
            if (!conversationalLead && acc.indexOf("[TRIGGER_LEAD_FORM]") !== -1) {
              controller.enqueue(sseChunk("[TRIGGER_LEAD_FORM]"));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            console.log(`[chat] ⏱ total request: ${Date.now() - tStart}ms`);
          } catch (streamErr) {
            console.error("[chat] streaming error:", streamErr);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ══════════════════════════════════════════════════════
    // NON-STREAMING PATH (tool calls, Instagram, explicit stream:false)
    // ══════════════════════════════════════════════════════
    const convo: any[] = [...messages];
    let aiMessage: any = null;
    const tAi = Date.now();

    for (let step = 0; step < 3; step++) {
      const aiResponse = await callAi(convo, false);
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
    console.log(`[chat] ⏱ AI call (non-streaming, incl. tools): ${Date.now() - tAi}ms`);

    const fullMessage = aiMessage?.content || "";
    const { cleanMessage, triggerLead } = await postProcess(fullMessage);
    console.log(`[chat] ⏱ total request: ${Date.now() - tStart}ms`);

    return jsonResp({
      message: cleanMessage,
      source: (faqSource || responseSource) as ResponseSource,
      trigger_lead_form: triggerLead,
    });


  } catch (error: any) {
    console.error("chat error:", error);
    return jsonResp({ error: error.message }, 500);
  }
});

// ══════════════════════════════════════════════════════
// PLAN CONFIGS — short-lived in-memory cache (warm starts only, 5 min TTL)
// Only plan configuration is cached; never client/bot specific data.
// ══════════════════════════════════════════════════════
const PLAN_CONFIG_TTL_MS = 5 * 60 * 1000;
let planConfigsCache: { data: any[] | null; at: number } | null = null;

async function getPlanConfigs(supabase: any): Promise<{ data: any[] | null }> {
  const now = Date.now();
  if (planConfigsCache && now - planConfigsCache.at < PLAN_CONFIG_TTL_MS) {
    console.log("[chat] plan_configs served from warm cache");
    return { data: planConfigsCache.data };
  }
  const { data } = await supabase
    .from("plan_configs")
    .select("plan_name, max_conversations_month, chat_model, knowledge_base_wizard");
  planConfigsCache = { data: data || null, at: now };
  return { data: data || null };
}

// ══════════════════════════════════════════════════════
// RAG — inline vector search (same query/params as the rag-search function,
// without the extra HTTP hop)
// ══════════════════════════════════════════════════════
async function searchKnowledgeChunks(
  supabase: any,
  chatbotId: string,
  query: string,
  matchCount = 5,
  matchThreshold = 0.6,
): Promise<any[]> {
  if (!query) return [];

  const { count } = await supabase
    .from("knowledge_chunks")
    .select("id", { count: "exact", head: true })
    .eq("chatbot_id", chatbotId);
  if (!count) return [];

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    console.error("[chat] OPENAI_API_KEY not configured for embeddings");
    return [];
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
  });
  if (!res.ok) {
    console.error("[chat] embedding error:", res.status, await res.text());
    return [];
  }
  const embedding = (await res.json()).data[0].embedding as number[];

  const { data: chunks, error } = await supabase.rpc("match_chunks", {
    _chatbot_id: chatbotId,
    _query_embedding: `[${embedding.join(",")}]`,
    _match_count: matchCount,
    _match_threshold: matchThreshold,
  });
  if (error) {
    console.error("[chat] match_chunks error:", error.message);
    return [];
  }

  // Priority boost: priority 3 = +0.08, priority 1 = -0.05 (same as rag-search)
  const boosted = (chunks || []).map((chunk: any) => {
    const priority = chunk.priority ?? 2;
    const boost = priority === 3 ? 0.08 : priority === 1 ? -0.05 : 0;
    return { ...chunk, similarity: Math.min(1.0, (chunk.similarity || 0) + boost) };
  });
  boosted.sort((a: any, b: any) => b.similarity - a.similarity);
  return boosted;
}

// ══════════════════════════════════════════════════════
// PAGES INDEX — compact list of ready sources with a page link
// ══════════════════════════════════════════════════════
async function buildPagesIndex(supabase: any, chatbotId: string): Promise<string> {
  try {
    const [{ count: totalPages }, { data: pages }] = await Promise.all([
      supabase.from("knowledge_base").select("id", { count: "exact", head: true })
        .eq("chatbot_id", chatbotId).eq("status", "ready").not("page_url", "is", null),
      supabase.from("knowledge_base").select("name, page_url")
        .eq("chatbot_id", chatbotId).eq("status", "ready").not("page_url", "is", null)
        .order("name", { ascending: true }).limit(60),
    ]);
    if (!pages || pages.length === 0) return "";
    const lines = pages.map((p: any) => `- ${p.name}: ${p.page_url}`);
    if ((totalPages || pages.length) > pages.length) {
      lines.push(`...and ${(totalPages || pages.length) - pages.length} more pages`);
    }
    return "\n\n--- AVAILABLE PAGES INDEX ---\n" + lines.join("\n") + "\n--- END INDEX ---";
  } catch (idxErr) {
    console.error("[chat] pages index fetch error (non-blocking):", idxErr);
    return "";
  }
}

// ══════════════════════════════════════════════════════
// FAQ CONTEXT
// <= 40 FAQs  → inject them all (FAQ_DIRECT), no matching at all
//  > 40 FAQs  → embedding pre-filter (FAQ_SEMANTIC), top 5 over ~0.80 cosine
// ══════════════════════════════════════════════════════
const FAQ_DIRECT_LIMIT = 40;
const FAQ_SEMANTIC_THRESHOLD = 0.6;
const FAQ_SEMANTIC_TOP_K = 5;

async function buildFaqContext(
  supabase: any,
  chatbotId: string,
  userMessage: string,
): Promise<{ block: string; source: "FAQ_DIRECT" | "FAQ_SEMANTIC" } | null> {
  const { data: faqs, error } = await supabase
    .from("faqs")
    .select("question, answer")
    .eq("chatbot_id", chatbotId);

  if (error || !faqs?.length) return null;

  const header =
    "--- VERIFIED FAQ (HIGHEST PRIORITY KNOWLEDGE) ---\n" +
    "Le seguenti sono FAQ verificate. Se la domanda dell'utente corrisponde anche solo nel significato a una di queste, usa ESATTAMENTE questa risposta, riformulandola in modo naturale ma senza cambiarne il contenuto. Non contraddire mai una FAQ e non inventare risposte alternative quando una FAQ copre l'argomento.\n\n";
  const render = (list: any[]) =>
    header +
    list.map((f: any, i: number) => `${i + 1}. Domanda: ${f.question}\n   Risposta: ${f.answer}`).join("\n\n") +
    "\n--- END FAQ ---\n\n";

  if (faqs.length <= FAQ_DIRECT_LIMIT) {
    return { block: render(faqs), source: "FAQ_DIRECT" };
  }

  // Large FAQ sets: semantic pre-filter via embeddings (same infra as rag-search)
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured for FAQ embeddings");

    const inputs = [userMessage, ...faqs.map((f: any) => f.question)];
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: inputs }),
    });
    if (!res.ok) throw new Error(`embedding error ${res.status}`);
    const data = await res.json();
    const vectors: number[][] = data.data
      .slice()
      .sort((a: any, b: any) => a.index - b.index)
      .map((d: any) => d.embedding);

    const queryVec = vectors[0];
    const ranked = faqs
      .map((f: any, i: number) => ({ faq: f, score: cosineSimilarity(queryVec, vectors[i + 1]) }))
      .sort((a: any, b: any) => b.score - a.score);
    console.log(`[chat] FAQ_SEMANTIC scores top3: ${ranked.slice(0, 3).map((s: any) => s.score.toFixed(3)).join(", ")}`);

    const scored = ranked.filter((s: any) => s.score >= FAQ_SEMANTIC_THRESHOLD).slice(0, FAQ_SEMANTIC_TOP_K);

    if (!scored.length) return null;
    console.log(`[chat] FAQ_SEMANTIC | ${scored.length} matches, best=${scored[0].score.toFixed(3)}`);
    return { block: render(scored.map((s: any) => s.faq)), source: "FAQ_SEMANTIC" };
  } catch (e) {
    console.error("[chat] FAQ semantic search error (non-blocking):", e);
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
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
  allMessages: any[], source_url: string | undefined, lang: string,
  leadCaptured = false
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
        ...(leadCaptured ? { lead_captured: true } : {}),
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
        lead_captured: leadCaptured,
      });
    }
  } catch (err) {
    console.error("Session save error (non-blocking):", err);
  }
}

// ══════════════════════════════════════════════════════
// CONVERSATIONAL LEAD — same logic as capture-lead/index.ts
// ══════════════════════════════════════════════════════
async function createConversationalLead(
  supabase: any,
  botConfig: any,
  lead: {
    name: string; email: string; phone: string; message: string;
    transcript: any[]; source_url?: string; lang: string;
  }
) {
  const { data: clientData } = await supabase
    .from("clients").select("plan").eq("id", botConfig.client_id).single();
  const clientPlan = clientData?.plan || "free";

  const { data: planConfig } = await supabase
    .from("plan_configs").select("max_leads_month").eq("plan_name", clientPlan).single();
  const maxLeads = planConfig?.max_leads_month ?? 10;

  let leadLimitReached = false;
  if (maxLeads !== -1) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("leads").select("id", { count: "exact", head: true })
      .eq("client_id", botConfig.client_id)
      .gte("created_at", monthStart.toISOString());
    if ((count || 0) >= maxLeads) leadLimitReached = true;
  }

  const { error: leadError } = await supabase.from("leads").insert({
    client_id: botConfig.client_id,
    bot_id: botConfig.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    transcript: lead.transcript,
    source_url: lead.source_url || "",
    status: "new",
    language: lead.lang,
  });
  if (leadError) throw leadError;

  if (!botConfig.email_notifications_enabled || !botConfig.notification_email || leadLimitReached) return;

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;

  try {
    const brand = await fetchBrandSettings(supabase);
    const ownerLocale = await resolveClientOwnerLocale(supabase, botConfig.client_id);
    const dashboardUrl = "https://white-label-converser.lovable.app/dashboard/leads";
    const customTpl = await fetchCustomTemplate(supabase, "chatbot_notification", ownerLocale);

    let emailHtml: string;
    let emailSubject: string;

    if (customTpl) {
      const vars = {
        "{{nome}}": lead.name, "{{email}}": lead.email,
        "{{messaggio}}": (lead.message || "").substring(0, 150),
        "{{data}}": new Date().toLocaleString(ownerLocale === "en" ? "en-GB" : "it-IT", { timeZone: "Europe/Rome" }),
        "{{link}}": dashboardUrl, "{{app_name}}": brand.app_name,
        "{{logo_url}}": brand.logo_url || "", "{{bot_name}}": botConfig.name,
      };
      emailHtml = renderCustomTemplate(brand, customTpl, vars);
      emailSubject = replaceSubjectVars(customTpl.subject, vars);
    } else {
      emailHtml = newLeadEmail(brand, {
        botName: botConfig.name, visitorName: lead.name, visitorEmail: lead.email,
        phone: lead.phone, message: lead.message, sourceUrl: lead.source_url,
        language: lead.lang, transcript: lead.transcript, dashboardUrl,
      }, ownerLocale);
      emailSubject = newLeadSubject(lead.name, botConfig.name, ownerLocale);
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${brand.app_name} <noreply@chatbot.your-genius.com>`,
        to: [botConfig.notification_email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });
  } catch (emailErr) {
    console.error("[chat] conversational lead email error:", emailErr);
  }
}


// ── Hotel profile → structured prompt block (empty sections skipped) ──
function buildHotelContext(raw: any, conversationalLead: boolean, room = ""): string {
  const hp = raw && typeof raw === "object" ? raw : {};
  const v = (x: unknown) => (x === null || x === undefined ? "" : String(x).trim());
  const line = (label: string, val: unknown) => (v(val) ? `- ${label}: ${v(val)}\n` : "");
  const sections: string[] = [];

  const p = hp.property || {};
  let s = line("Name", p.name) + line("Type", p.type) + line("Stars", p.stars) + line("Address", p.address) +
    line("Phone", p.phone) + line("Email", p.email) +
    line("Check-in", [v(p.checkin_from), v(p.checkin_to)].filter(Boolean).join(" – ")) +
    line("Check-out by", p.checkout_until) + line("Reception hours", p.reception_hours) +
    line("Languages spoken", Array.isArray(p.languages) ? p.languages.join(", ") : "");
  if (s) sections.push(`PROPERTY\n${s}`);

  const rooms = (Array.isArray(hp.rooms) ? hp.rooms : []).filter((r: any) => v(r?.name));
  if (rooms.length) {
    sections.push("ROOMS\n" + rooms.map((r: any) => {
      const cap = [r.max_adults ? `${r.max_adults} adults` : "", r.max_children ? `${r.max_children} children` : ""].filter(Boolean).join(" + ");
      const bits = [
        cap && `max ${cap}`, v(r.beds) && `beds: ${v(r.beds)}`, r.size_m2 ? `${r.size_m2} m²` : "",
        r.price_from ? `price from €${r.price_from}/night` : "",
        Array.isArray(r.amenities) && r.amenities.length ? `amenities: ${r.amenities.join(", ")}` : "",
      ].filter(Boolean).join("; ");
      return `- ${v(r.name)}${bits ? ` (${bits})` : ""}${v(r.description) ? `: ${v(r.description)}` : ""}`;
    }).join("\n") + "\n");
  }

  const services = (Array.isArray(hp.services) ? hp.services : []).filter((x: any) => v(x?.name));
  if (services.length) {
    sections.push("SERVICES\n" + services.map((x: any) => {
      const bits = [v(x.hours) && `hours: ${v(x.hours)}`, x.included ? "included" : v(x.price) && `price: ${v(x.price)}`].filter(Boolean).join("; ");
      return `- ${v(x.name)}${bits ? ` (${bits})` : ""}${v(x.description) ? `: ${v(x.description)}` : ""}`;
    }).join("\n") + "\n");
  }

  const po = hp.policies || {};
  s = line("Cancellation", po.cancellation) + line("Children", po.children) + line("Pets", po.pets) +
    line("Late check-out", po.late_checkout) + line("Early check-in", po.early_checkin) + line("City tax", po.city_tax) +
    line("Payment methods", po.payment_methods) + line("Parking", po.parking);
  if (s) sections.push(`POLICIES\n${s}`);

  const guide = (Array.isArray(hp.local_guide) ? hp.local_guide : []).filter((x: any) => v(x?.name));
  if (guide.length) {
    sections.push("LOCAL GUIDE\n" + guide.map((x: any) =>
      `- [${v(x.category) || "altro"}] ${v(x.name)}${v(x.distance) ? ` (${v(x.distance)})` : ""}${v(x.description) ? `: ${v(x.description)}` : ""}${v(x.link) ? ` — ${v(x.link)}` : ""}`
    ).join("\n") + "\n");
  }

  const b = hp.booking || {};
  s = line("Booking phone", b.phone_booking) + line("Booking email", b.email_booking) +
    (v(b.engine_url_template) ? "- Online booking engine: available (the guest gets the link after sending the request form)\n" : "");
  if (s) sections.push(`BOOKING\n${s}`);

  const rv = hp.reviews || {};
  s = line("Google reviews", rv.google_url) + line("Booking.com reviews", rv.booking_url) + line("Tripadvisor", rv.tripadvisor_url);
  if (s) sections.push(`REVIEWS\n${s}`);

  if (!sections.length) return "";

  const quoteRule = room
    ? `The guest is already staying at the property${room ? `, in room ${room}` : ""}. IN-STAY MODE: do not offer quotes, booking links or availability checks. Help with property services, opening hours, local recommendations and guest requests. Never emit [TRIGGER_LEAD_FORM] for a stay request.`
    : conversationalLead
    ? "If the guest asks about availability or a quote, first collect naturally the arrival and departure dates and the number of adults and children, one question at a time."
    : "If the guest asks about availability or a quote, first ask naturally (if not already given) for arrival and departure dates and the number of adults and children, then append the marker [TRIGGER_LEAD_FORM] on its own final line so they can send the stay request.";

  return `\n\n--- HOTEL PROFILE ---\n${sections.join("\n")}--- END HOTEL PROFILE ---\n\nHOTEL CONCIERGE RULES:\n- Always reply in the guest's language.\n- Only mention topics present in the HOTEL PROFILE; if a section is missing, don't talk about it.\n- Never invent availability or final prices. Present price_from values as "starting from" and invite the guest to verify availability and the exact price for their dates.\n- Suggest the room that fits the number of guests (respect max adults/children).\n- For local recommendations suggest at most 3 relevant places.\n- ${quoteRule}`;
}
