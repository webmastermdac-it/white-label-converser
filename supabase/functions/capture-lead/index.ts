import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { embed_token, name, email, phone, message, transcript, session_token, source_url } = body;

    // Get bot config
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

    // Insert lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        client_id: botConfig.client_id,
        bot_id: botConfig.id,
        name,
        email,
        phone: phone || "",
        message: message || "",
        transcript: transcript || [],
        source_url: source_url || "",
        status: "new",
      })
      .select()
      .single();

    if (leadError) throw leadError;

    // Update chat session with lead info
    if (session_token) {
      await supabase.from("chat_sessions").update({ ended_at: new Date().toISOString() })
        .eq("session_token", session_token);
    }

    // Send email notification if enabled
    if (botConfig.email_notifications_enabled && botConfig.notification_email) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const transcriptHtml = (transcript || [])
          .map((m: any) => `<div style="margin: 8px 0; padding: 8px; border-radius: 8px; background: ${m.role === 'user' ? '#f0f0f0' : '#e8f0fe'}">
            <strong>${m.role === 'user' ? '👤 Utente' : '🤖 Bot'}:</strong> ${m.content}
          </div>`)
          .join("");

        const emailHtml = `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; border-radius: 12px; overflow: hidden;">
            <div style="background: #e94560; padding: 20px 24px;">
              <h1 style="margin: 0; font-size: 20px;">🎯 New Lead Captured!</h1>
              <p style="margin: 4px 0 0; opacity: 0.85;">${botConfig.name}</p>
            </div>
            <div style="padding: 24px;">
              <h2 style="color: #e94560; margin-top: 0;">Contact Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #888;">Name</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
                <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0;">${email}</td></tr>
                <tr><td style="padding: 8px 0; color: #888;">Phone</td><td style="padding: 8px 0;">${phone || "—"}</td></tr>
                <tr><td style="padding: 8px 0; color: #888;">Message</td><td style="padding: 8px 0;">${message || "—"}</td></tr>
                <tr><td style="padding: 8px 0; color: #888;">Source</td><td style="padding: 8px 0;">${source_url || "—"}</td></tr>
              </table>
              ${transcript?.length > 0 ? `<h2 style="color: #e94560; margin-top: 24px;">Chat Transcript</h2><div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px;">${transcriptHtml}</div>` : ""}
            </div>
          </div>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "MDAC ChatBot <leads@mdacchatbot.com>",
            to: [botConfig.notification_email],
            subject: `🎯 New Lead: ${name} — ${botConfig.name}`,
            html: emailHtml,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: lead.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("capture-lead error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
