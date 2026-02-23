import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, embed_token, session_token, source_url, language } = await req.json();
    // Keep full language code (e.g. 'fr-FR', 'de-DE')
    const lang = language || "en";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: botConfig, error: configError } = await supabase
      .from("chatbot_configs")
      .select("*")
      .eq("embed_token", embed_token)
      .single();

    if (configError || !botConfig) {
      return new Response(JSON.stringify({ error: "Invalid embed token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- Plan limit enforcement via plan_configs ---
    const { data: client } = await supabase
      .from("clients")
      .select("plan")
      .eq("id", botConfig.client_id)
      .single();

    const plan = client?.plan || "free";

    const { data: planConfig } = await supabase
      .from("plan_configs")
      .select("max_conversations_month")
      .eq("plan_name", plan)
      .single();

    const maxConv = planConfig?.max_conversations_month ?? 50;

    if (maxConv !== -1) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", botConfig.client_id)
        .gte("started_at", monthStart.toISOString());

      if ((count || 0) >= maxConv) {
        return new Response(JSON.stringify({
          error: "plan_limit",
          message: "Monthly conversation limit reached. Upgrade to continue.",
          trigger_lead_form: true,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Use fallback messages as inspiration for the AI, not as fixed strings
    const fallbackConcept = botConfig.fallback_msg_en || botConfig.fallback_message || "I don't have this information, but I can connect you with one of our consultants!";

    // Check if client has product catalog
    let productKnowledge = "";
    if (botConfig.knowledge_base_products) {
      productKnowledge = botConfig.knowledge_base_products;
    }

    const productInstruction = productKnowledge
      ? `\n\nYou have access to the store's updated product catalog. When users ask about products: search the catalog and answer accurately, always mention the exact price and availability, if there are variants list them with prices and stock, if a product is out of stock say so and suggest similar available products, never invent products not in the catalog, you can provide a direct link to the product if available.`
      : "";

    // Universal language instruction
    const languageInstruction = `

IMPORTANT LANGUAGE RULE:
The visitor is using language code: ${lang}
You MUST always respond in the same language the visitor is writing in, regardless of the language of the knowledge base.
If the visitor writes in French, respond in French.
If the visitor writes in Spanish, respond in Spanish.
If the visitor writes in German, respond in German.
Adapt naturally to any language the visitor uses.
The only exception: if the visitor explicitly asks you to switch to a different language, do so.`;

    const fallbackInstruction = `

FALLBACK RULE:
When you don't know the answer or are uncertain, you must:
1. Write a fallback message in the SAME language the visitor is using.
2. The concept to convey is: "${fallbackConcept}" — translate and adapt this naturally to whatever language the visitor is using.
3. After saying the fallback message, include the special marker: [TRIGGER_LEAD_FORM]
4. Never make up information not provided in your knowledge base.`;

    const formattingInstruction = `

FORMATTING RULES:
- Use **bold** only for plan names and prices
- Use bullet lists only when listing 3+ items
- Keep responses concise: max 4-5 lines per answer
- No headers (##) in responses
- End with ONE short question to keep the conversation going
- Never use excessive formatting — write naturally`;

    const systemPrompt = `${botConfig.knowledge_base || "You are a helpful assistant."}${productKnowledge ? "\n\n" + productKnowledge : ""}

IMPORTANT INSTRUCTIONS:
- Be concise, helpful, and professional${languageInstruction}${fallbackInstruction}${productInstruction}${formattingInstruction}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "";

    const triggerLeadForm = aiMessage.includes("[TRIGGER_LEAD_FORM]");

    const cleanMessage = aiMessage.replace("[TRIGGER_LEAD_FORM]", "").trim();

    // Save/update chat session with full language code
    if (session_token) {
      const allMessages = [...messages, { role: "assistant", content: cleanMessage }];
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
    }

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        trigger_lead_form: triggerLeadForm,
        bot_id: botConfig.id,
        client_id: botConfig.client_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
