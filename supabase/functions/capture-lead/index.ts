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
    const { embed_token, session_token, source_url, language } = body;
    const lang = language === "en" ? "en" : "it";

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

    // Check lead limits for free plan
    const { data: clientData } = await supabase
      .from("clients")
      .select("plan")
      .eq("id", botConfig.client_id)
      .single();

    const clientPlan = clientData?.plan || "free";
    let leadLimitReached = false;

    if (clientPlan === "free") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("client_id", botConfig.client_id)
        .gte("created_at", monthStart.toISOString());

      if ((count || 0) >= 10) {
        leadLimitReached = true;
      }
    }

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
        language: lang,
      })
      .select()
      .single();

    if (leadError) throw leadError;

    // Update chat session
    if (session_token) {
      await supabase.from("chat_sessions").update({ ended_at: new Date().toISOString() })
        .eq("session_token", session_token);
    }

    // Send bilingual email notification (skip if lead limit reached on free plan)
    if (botConfig.email_notifications_enabled && botConfig.notification_email && !leadLimitReached) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const isEn = lang === "en";

        const transcriptHtml = (transcript || [])
          .map((m: any) => {
            const isUser = m.role === "user";
            return `<div style="display:flex;justify-content:${isUser ? "flex-end" : "flex-start"};margin:6px 0;">
              <div style="max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;
                ${isUser
                  ? `background:${botConfig.primary_color || "#E94560"};color:#fff;border-bottom-right-radius:4px;`
                  : `background:#f3f4f6;color:#1a1a2e;border:1px solid #e5e7eb;border-bottom-left-radius:4px;`
                }">
                <div style="font-size:11px;font-weight:600;margin-bottom:3px;opacity:0.7;">${isUser ? (isEn ? "👤 User" : "👤 Utente") : "🤖 " + escHtml(botConfig.name)}</div>
                ${escHtml(m.content)}
              </div>
            </div>`;
          })
          .join("");

        const dashboardUrl = "https://id-preview--edbbbdba-afd9-4dc6-9f8a-3c34c421c770.lovable.app/dashboard/leads";

        const i18n = isEn ? {
          title: "🔔 New Lead Captured!",
          detailsTitle: "📋 Contact Details",
          nameLabel: "Name",
          emailLabel: "Email",
          phoneLabel: "Phone",
          messageLabel: "Message",
          pageLabel: "Page",
          transcriptTitle: "💬 Chat Transcript",
          ctaLabel: "View in Dashboard →",
          footer: "Genius Chatbot Builder — A product by MDAC S.r.l.",
          subject: `🔔 New Lead: ${name} - ${botConfig.name}`,
        } : {
          title: "🔔 Nuovo Lead Catturato!",
          detailsTitle: "📋 Dettagli Contatto",
          nameLabel: "Nome",
          emailLabel: "Email",
          phoneLabel: "Telefono",
          messageLabel: "Messaggio",
          pageLabel: "Pagina",
          transcriptTitle: "💬 Trascrizione Chat",
          ctaLabel: "Vedi nel Dashboard →",
          footer: "Genius Chatbot Builder — Un prodotto MDAC S.r.l.",
          subject: `🔔 Nuovo Lead: ${name} - ${botConfig.name}`,
        };

        const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:${botConfig.primary_color || "#E94560"};padding:24px 28px;">
    <h1 style="margin:0;font-size:22px;color:#ffffff;">${i18n.title}</h1>
    <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${escHtml(botConfig.name)}</p>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 16px;font-size:16px;color:#1a1a2e;">${i18n.detailsTitle}</h2>
    <div style="background:#f9fafb;border-radius:12px;padding:16px;border:1px solid #e5e7eb;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:100px;">${i18n.nameLabel}</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#1a1a2e;">${escHtml(name)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">${i18n.emailLabel}</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${escHtml(email)}" style="color:${botConfig.primary_color || "#E94560"};text-decoration:none;">${escHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">${i18n.phoneLabel}</td><td style="padding:8px 0;font-size:14px;color:#1a1a2e;">${escHtml(phone) || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">${i18n.messageLabel}</td><td style="padding:8px 0;font-size:14px;color:#1a1a2e;">${escHtml(message) || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">${i18n.pageLabel}</td><td style="padding:8px 0;font-size:13px;color:#6b7280;">${escHtml(source_url || "—")}</td></tr>
      </table>
    </div>
    ${transcript?.length > 0 ? `
    <h2 style="margin:28px 0 12px;font-size:16px;color:#1a1a2e;">${i18n.transcriptTitle}</h2>
    <div style="background:#f9fafb;border-radius:12px;padding:16px;border:1px solid #e5e7eb;max-height:400px;overflow-y:auto;">
      ${transcriptHtml}
    </div>` : ""}
    <div style="text-align:center;margin-top:28px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:${botConfig.primary_color || "#E94560"};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;font-size:14px;">
        ${i18n.ctaLabel}
      </a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">${i18n.footer}</p>
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
              subject: i18n.subject,
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
