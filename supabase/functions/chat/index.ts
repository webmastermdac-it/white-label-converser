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

    // Step 1: fetch bot config (required for everything else)
    const { data: botConfig, error: configError } = await supabase
      .from("chatbot_configs")
      .select("*")
      .eq("embed_token", embed_token)
      .single();

    if (configError || !botConfig) {
      return jsonResp({ error: "Invalid embed token" }, 401);
    }

    // Step 2: fetch client + planConfig IN PARALLEL
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [clientRes, sessionCountRes] = await Promise.all([
      supabase.from("clients").select("plan").eq("id", botConfig.client_id).single(),
      supabase.from("chat_sessions").select("id", { count: "exact", head: true })
        .eq("client_id", botConfig.client_id).gte("started_at", monthStart.toISOString()),
    ]);

    const plan = clientRes.data?.plan || "free";

    // Fetch plan config (needs plan value)
    const { data: planConfig } = await supabase
      .from("plan_configs")
      .select("max_conversations_month, chat_model, knowledge_base_wizard")
      .eq("plan_name", plan)
      .single();

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

    // Step 3: Build system prompt + RAG search IN PARALLEL with prompt construction
    const fallbackConcept = botConfig.fallback_msg_en || botConfig.fallback_message || "I don't have this information, but I can connect you with one of our consultants!";

    let productKnowledge = botConfig.knowledge_base_products || "";

    const productInstruction = productKnowledge
      ? `\n\nYou have access to the store's updated product catalog. When users ask about products: search the catalog and answer accurately, always mention the exact price and availability, if there are variants list them with prices and stock, if a product is out of stock say so and suggest similar available products, never invent products not in the catalog, you can provide a direct link to the product if available.`
      : "";

    const languageInstruction = `\n\nIMPORTANT LANGUAGE RULE:\nThe visitor is using language code: ${lang}\nYou MUST always respond in the same language the visitor is writing in, regardless of the language of the knowledge base.\nAdapt naturally to any language the visitor uses.\nThe only exception: if the visitor explicitly asks you to switch to a different language, do so.`;

    const fallbackInstruction = `\n\nFALLBACK RULE:\nWhen you don't know the answer or are uncertain, you must:\n1. Write a fallback message in the SAME language the visitor is using.\n2. The concept to convey is: "${fallbackConcept}" — translate and adapt this naturally.\n3. After saying the fallback message, include the special marker: [TRIGGER_LEAD_FORM]\n4. Never make up information not provided in your knowledge base.`;

    const formattingInstruction = `\n\nFORMATTING RULES:\n- Use **bold** only for plan names and prices\n- Use bullet lists only when listing 3+ items\n- Keep responses concise: max 4-5 lines per answer\n- No headers (##) in responses\n- End with ONE short question to keep the conversation going\n- Never use excessive formatting — write naturally`;

    // RAG search (non-blocking, only for paid plans)
    let ragContext = "";
    if (ragAllowed) {
      const lastUserMessage = messages[messages.length - 1]?.content || "";
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
              match_threshold: 0.5,
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
          }
        }
      } catch (ragErr) {
        console.error("RAG search error (non-blocking):", ragErr);
      }
    }

    const systemPrompt = `${botConfig.knowledge_base || "You are a helpful assistant."}${productKnowledge ? "\n\n" + productKnowledge : ""}${ragContext}\n\nIMPORTANT INSTRUCTIONS:\n- Be concise, helpful, and professional${languageInstruction}${fallbackInstruction}${productInstruction}${formattingInstruction}`;

    // Step 4: Call AI gateway
    const gatewayModel = MODEL_MAP[chatModel] || "openai/gpt-5-mini";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return jsonResp({ error: "Rate limit exceeded" }, 429);
      if (status === 402) return jsonResp({ error: "AI credits exhausted" }, 402);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "";

    const triggerLeadForm = aiMessage.includes("[TRIGGER_LEAD_FORM]");
    const cleanMessage = aiMessage.replace("[TRIGGER_LEAD_FORM]", "").trim();

    // Step 5: Save session (fire-and-forget, don't await)
    if (session_token) {
      const allMessages = [...messages, { role: "assistant", content: cleanMessage }];
      saveSession(supabase, session_token, botConfig, allMessages, source_url, lang);
    }

    return jsonResp({
      message: cleanMessage,
      trigger_lead_form: triggerLeadForm,
      bot_id: botConfig.id,
      client_id: botConfig.client_id,
    });
  } catch (error: any) {
    console.error("chat error:", error);
    return jsonResp({ error: error.message }, 500);
  }
});

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
