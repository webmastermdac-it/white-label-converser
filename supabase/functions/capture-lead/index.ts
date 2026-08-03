import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchBrandSettings, newLeadEmail, newLeadSubject, fetchCustomTemplate, renderCustomTemplate, replaceSubjectVars, resolveClientOwnerLocale, type Locale } from "../_shared/email-template.ts";

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
    const { embed_token, session_token, source_url, language } = body;
    const lang = language || "en";

    const lead = body.lead || {};
    const name = body.name || lead.name;
    const email = body.email || lead.email;
    const phone = body.phone || lead.phone || "";
    const message = body.message || lead.message || "";
    const transcript = body.transcript || [];

    if (!name || String(name).trim() === "") {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if ((!email || String(email).trim() === "") && (!phone || String(phone).trim() === "")) {
      return new Response(JSON.stringify({ error: "Email or phone is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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

    const { data: clientData } = await supabase
      .from("clients")
      .select("plan")
      .eq("id", botConfig.client_id)
      .single();

    const clientPlan = clientData?.plan || "free";
    let leadLimitReached = false;

    const { data: planConfig } = await supabase
      .from("plan_configs")
      .select("max_leads_month")
      .eq("plan_name", clientPlan)
      .single();

    const maxLeads = planConfig?.max_leads_month ?? 10;

    if (maxLeads !== -1) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("client_id", botConfig.client_id)
        .gte("created_at", monthStart.toISOString());

      if ((count || 0) >= maxLeads) leadLimitReached = true;
    }

    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .insert({
        client_id: botConfig.client_id,
        bot_id: botConfig.id,
        name, email, phone, message, transcript,
        source_url: source_url || "",
        status: "new",
        language: lang,
      })
      .select()
      .single();

    if (leadError) throw leadError;

    if (session_token) {
      await supabase.from("chat_sessions").update({ ended_at: new Date().toISOString() })
        .eq("session_token", session_token);
    }

    // Send email notification in the client owner's language
    if (botConfig.email_notifications_enabled && botConfig.notification_email && !leadLimitReached) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const brand = await fetchBrandSettings(supabase);
        const ownerLocale = await resolveClientOwnerLocale(supabase, botConfig.client_id);
        const dashboardUrl = "https://white-label-converser.lovable.app/dashboard/leads";
        const customTpl = await fetchCustomTemplate(supabase, "chatbot_notification", ownerLocale);

        let emailHtml: string;
        let emailSubject: string;

        if (customTpl) {
          const vars = {
            "{{nome}}": name, "{{email}}": email, "{{messaggio}}": (message || "").substring(0, 150),
            "{{data}}": new Date().toLocaleString(ownerLocale === "en" ? "en-GB" : "it-IT", { timeZone: "Europe/Rome" }),
            "{{link}}": dashboardUrl, "{{app_name}}": brand.app_name,
            "{{logo_url}}": brand.logo_url || "", "{{bot_name}}": botConfig.name,
          };
          emailHtml = renderCustomTemplate(brand, customTpl, vars);
          emailSubject = replaceSubjectVars(customTpl.subject, vars);
        } else {
          emailHtml = newLeadEmail(brand, {
            botName: botConfig.name, visitorName: name, visitorEmail: email,
            phone, message, sourceUrl: source_url, language: lang, transcript, dashboardUrl,
          }, ownerLocale);
          emailSubject = newLeadSubject(name, botConfig.name, ownerLocale);
        }

        try {
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
