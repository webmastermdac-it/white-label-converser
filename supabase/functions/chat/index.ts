import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, embed_token, session_token, source_url } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch bot config by embed token
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

    const systemPrompt = `${botConfig.knowledge_base || "You are a helpful assistant."}

IMPORTANT INSTRUCTIONS:
- If you don't know the answer or are uncertain, say the following EXACT phrase (or very similar): "${botConfig.fallback_message}"
- After saying the fallback message, include the special marker: [TRIGGER_LEAD_FORM]
- Never make up information not provided in your knowledge base
- Be concise, helpful, and professional
- Respond in the same language as the user`;

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

    // Detect fallback trigger
    const triggerLeadForm = aiMessage.includes("[TRIGGER_LEAD_FORM]") ||
      aiMessage.toLowerCase().includes("non ho questa informazione") ||
      aiMessage.toLowerCase().includes("non so") ||
      aiMessage.toLowerCase().includes("i don't have");

    const cleanMessage = aiMessage.replace("[TRIGGER_LEAD_FORM]", "").trim();

    // Save/update chat session
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
        }).eq("session_token", session_token);
      } else {
        await supabase.from("chat_sessions").insert({
          client_id: botConfig.client_id,
          bot_id: botConfig.id,
          messages: allMessages,
          session_token,
          source_url: source_url || "",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        trigger_lead_form: triggerLeadForm,
        fallback_message: triggerLeadForm ? botConfig.fallback_message : null,
        calendly_url: triggerLeadForm ? botConfig.calendly_url : null,
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
