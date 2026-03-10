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
      .select("id, client_id, name, knowledge_base, fallback_message, fallback_msg_en, fallback_msg_it, welcome_msg_it, welcome_msg_en, knowledge_base_products")
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
              match_threshold: 0.75,
            }),
          }
        );
        if (ragResponse.ok) {
          const ragData = await ragResponse.json();
          if (ragData.chunks?.length > 0) {
            ragContext = "\n\n--- RELEVANT KNOWLEDGE BASE CONTEXT ---\n" +
              ragData.chunks.map((c: any, i: number) =>
                `[Source ${i + 1} (relevance: ${(c.similarity * 100).toFixed(0)}%)]\n${c.content}`
              ).join("\n\n") +
              "\n--- END CONTEXT ---\n\nIMPORTANT: Use the above context to answer the user's question accurately. If the context contains the answer, use it. If not, use your general knowledge base instructions.";
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

    const productInstruction = productKnowledge
      ? `\n\nYou have access to the store's updated product catalog. When users ask about products: search the catalog and answer accurately, always mention the exact price and availability, if there are variants list them with prices and stock, if a product is out of stock say so and suggest similar available products, never invent products not in the catalog, you can provide a direct link to the product if available.`
      : "";

    const languageInstruction = `\n\nIMPORTANT LANGUAGE RULE:\nThe visitor is using language code: ${lang}\nYou MUST always respond in the same language the visitor is writing in, regardless of the language of the knowledge base.\nAdapt naturally to any language the visitor uses.\nThe only exception: if the visitor explicitly asks you to switch to a different language, do so.`;

    const fallbackInstruction = `\n\nFALLBACK RULE:\nWhen you don't know the answer or are uncertain, you must:\n1. Write a fallback message in the SAME language the visitor is using.\n2. The concept to convey is: "${fallbackConcept}" — translate and adapt this naturally.\n3. After saying the fallback message, include the special marker: [TRIGGER_LEAD_FORM]\n4. Never make up information not provided in your knowledge base.`;

    const formattingInstruction = `\n\nFORMATTING RULES:\n- Use **bold** only for plan names and prices\n- Use bullet lists only when listing 3+ items\n- Keep responses concise: max 4-5 lines per answer\n- No headers (##) in responses\n- End with ONE short question to keep the conversation going\n- Never use excessive formatting — write naturally`;

    const instructions = botConfig.knowledge_base || "You are a helpful assistant.";
    const systemPrompt = `${instructions}${productKnowledge ? "\n\n" + productKnowledge : ""}${ragContext}\n\nIMPORTANT INSTRUCTIONS:\n- Be concise, helpful, and professional${languageInstruction}${fallbackInstruction}${productInstruction}${formattingInstruction}`;

    // ── Call AI gateway ──
    const gatewayModel = MODEL_MAP[chatModel] || "openai/gpt-5-mini";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return jsonResp({ error: "Rate limit exceeded" }, 429);
      if (status === 402) return jsonResp({ error: "AI credits exhausted" }, 402);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const fullMessage = aiData.choices?.[0]?.message?.content || "";
    const cleanMessage = fullMessage.replace("[TRIGGER_LEAD_FORM]", "").trim();
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
      });
    }
  } catch (err) {
    console.error("Session save error (non-blocking):", err);
  }
}
