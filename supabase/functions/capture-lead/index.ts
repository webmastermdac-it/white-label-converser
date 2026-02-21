import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escHtml(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { embed_token, session_token, source_url } = body;
    // Support both flat fields and nested lead object from widget
    const lead = body.lead || {};
    const name = body.name || lead.name;
    const email = body.email || lead.email;
    const phone = body.phone || lead.phone || "";
    const message = body.message || lead.message || "";
    const transcript = body.transcript || [];

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
    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .insert({
        client_id: botConfig.client_id,
        bot_id: botConfig.id,
        name,
        email,
        phone,
        message,
        transcript,
        source_url: source_url || "",
        status: "new",
      })
      .select()
      .single();

    if (leadError) throw leadError;

    // Update chat session
    if (session_token) {
      await supabase.from("chat_sessions").update({ ended_at: new Date().toISOString() })
        .eq("session_token", session_token);
    }

    // Send email notification
    if (botConfig.email_notifications_enabled && botConfig.notification_email) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const transcriptHtml = (transcript || [])
          .map((m: any) => {
            const isUser = m.role === "user";
            return `<div style="display:flex;justify-content:${isUser ? "flex-end" : "flex-start"};margin:6px 0;">
              <div style="max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;
                ${isUser
                  ? `background:${botConfig.primary_color || "#E94560"};color:#fff;border-bottom-right-radius:4px;`
                  : `background:#f3f4f6;color:#1a1a2e;border:1px solid #e5e7eb;border-bottom-left-radius:4px;`
                }">
                <div style="font-size:11px;font-weight:600;margin-bottom:3px;opacity:0.7;">${isUser ? "👤 Utente" : "🤖 " + escHtml(botConfig.name)}</div>
                ${escHtml(m.content)}
              </div>
            </div>`;
          })
          .join("");

        const dashboardUrl = "https://id-preview--edbbbdba-afd9-4dc6-9f8a-3c34c421c770.lovable.app/dashboard/leads";

        const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  
  <!-- Header -->
  <div style="background:${botConfig.primary_color || "#E94560"};padding:24px 28px;">
    <h1 style="margin:0;font-size:22px;color:#ffffff;">🔔 Nuovo Lead Catturato!</h1>
    <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${escHtml(botConfig.name)}</p>
  </div>

  <!-- Lead Details Card -->
  <div style="padding:28px;">
    <h2 style="margin:0 0 16px;font-size:16px;color:#1a1a2e;">📋 Dettagli Contatto</h2>
    <div style="background:#f9fafb;border-radius:12px;padding:16px;border:1px solid #e5e7eb;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:100px;">Nome</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#1a1a2e;">${escHtml(name)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Email</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${escHtml(email)}" style="color:${botConfig.primary_color || "#E94560"};text-decoration:none;">${escHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Telefono</td><td style="padding:8px 0;font-size:14px;color:#1a1a2e;">${escHtml(phone) || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Messaggio</td><td style="padding:8px 0;font-size:14px;color:#1a1a2e;">${escHtml(message) || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Pagina</td><td style="padding:8px 0;font-size:13px;color:#6b7280;">${escHtml(source_url || "—")}</td></tr>
      </table>
    </div>

    ${transcript?.length > 0 ? `
    <!-- Transcript -->
    <h2 style="margin:28px 0 12px;font-size:16px;color:#1a1a2e;">💬 Trascrizione Chat</h2>
    <div style="background:#f9fafb;border-radius:12px;padding:16px;border:1px solid #e5e7eb;max-height:400px;overflow-y:auto;">
      ${transcriptHtml}
    </div>` : ""}

    <!-- CTA -->
    <div style="text-align:center;margin-top:28px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:${botConfig.primary_color || "#E94560"};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;font-size:14px;">
        Vedi nel Dashboard →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">Genius Chatbot Builder</p>
  </div>

</div>
</body></html>`;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Genius Chatbot <onboarding@resend.dev>",
              to: [botConfig.notification_email],
              subject: `🔔 Nuovo Lead: ${name} - ${botConfig.name}`,
              html: emailHtml,
            }),
          });
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: leadData.id }),
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
