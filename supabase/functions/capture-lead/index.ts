import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchBrandSettings, newLeadEmail, newLeadSubject, hotelLeadSubject, fetchCustomTemplate, renderCustomTemplate, replaceSubjectVars, resolveClientOwnerLocale, type Locale } from "../_shared/email-template.ts";

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

    // ── Hotel: attach a stay request to the lead already collected in chat (no new lead) ──
    if (body.attach_to_session === true) {
      const J = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (typeof embed_token !== "string" || typeof session_token !== "string" || !session_token) return J({ error: "Invalid request" }, 400);
      const { data: bot } = await supabase.from("chatbot_configs").select("*").eq("embed_token", embed_token).maybeSingle();
      if (!bot || bot.business_vertical !== "hotel") return J({ error: "Invalid embed token" }, 401);
      const b = body.booking && typeof body.booking === "object" ? body.booking : {};
      const iso = /^\d{4}-\d{2}-\d{2}$/;
      const ci = String(b.check_in || ""), co = String(b.check_out || "");
      if (!iso.test(ci) || !iso.test(co) || co <= ci || ci < new Date(Date.now() - 86400000).toISOString().slice(0, 10)) return J({ error: "Invalid dates" }, 400);
      const { data: sess } = await supabase.from("chat_sessions").select("started_at, lead_captured, bot_id").eq("session_token", session_token).maybeSingle();
      if (!sess || !sess.lead_captured || (sess.bot_id && sess.bot_id !== bot.id)) return J({ error: "no_lead" }, 404);
      const { data: existing } = await supabase.from("leads").select("*")
        .eq("bot_id", bot.id).gte("created_at", sess.started_at)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!existing) return J({ error: "no_lead" }, 404);
      const sends = Number((existing.booking as any)?.sends) || 0;
      if (sends >= 3) return J({ error: "rate_limited" }, 429);
      const rooms = Array.isArray(bot.hotel_profile?.rooms) ? bot.hotel_profile.rooms : [];
      const room = b.room_id ? rooms.find((r: any) => r?.id === b.room_id) : null;
      const stay = {
        check_in: ci, check_out: co,
        adults: Math.min(Math.max(parseInt(b.adults) || 1, 1), 30),
        children: Math.min(Math.max(parseInt(b.children) || 0, 0), 30),
        room_id: room?.id || null, room_name: room?.name || null,
      };
      const { error: upErr } = await supabase.from("leads").update({ booking: { ...stay, sends: sends + 1 }, source: "hotel_quote" }).eq("id", existing.id);
      if (upErr) throw upErr;
      if (bot.email_notifications_enabled && bot.notification_email) {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          try {
            const brand = await fetchBrandSettings(supabase);
            const ownerLocale = await resolveClientOwnerLocale(supabase, bot.client_id);
            const html = newLeadEmail(brand, {
              botName: bot.name, visitorName: existing.name, visitorEmail: existing.email,
              phone: existing.phone || "", message: existing.message || "", sourceUrl: source_url || existing.source_url || "",
              language: lang, transcript: (existing.transcript as any) || [], dashboardUrl: "https://white-label-converser.lovable.app/dashboard/leads", booking: stay as any,
            }, ownerLocale);
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ from: `${brand.app_name} <noreply@chatbot.your-genius.com>`, to: [bot.notification_email], subject: hotelLeadSubject(stay as any, ownerLocale), html }),
            });
          } catch (e) { console.error("attach email error:", e); }
        }
      }
      return J({ success: true, lead_id: existing.id, attached: true });
    }

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

    // Hotel stay data — only accepted for hotel bots
    let booking: Record<string, unknown> | null = null;
    if (botConfig.business_vertical === "hotel" && body.booking && typeof body.booking === "object") {
      const b = body.booking;
      const iso = /^\d{4}-\d{2}-\d{2}$/;
      const today = new Date().toISOString().slice(0, 10);
      const ci = String(b.check_in || ""), co = String(b.check_out || "");
      if (!iso.test(ci) || !iso.test(co) || co <= ci || ci < new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
        return new Response(JSON.stringify({ error: "Invalid dates" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const adults = Math.min(Math.max(parseInt(b.adults) || 1, 1), 30);
      const children = Math.min(Math.max(parseInt(b.children) || 0, 0), 30);
      const rooms = Array.isArray(botConfig.hotel_profile?.rooms) ? botConfig.hotel_profile.rooms : [];
      const room = b.room_id ? rooms.find((r: any) => r?.id === b.room_id) : null;
      booking = { check_in: ci, check_out: co, adults, children, room_id: room?.id || null, room_name: room?.name || null };
      void today;
    }

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

    // Link the lead to its chat session so the dashboard can open the full conversation
    let sessionId: string | null = null;
    if (session_token) {
      const { data: sessRow } = await supabase.from("chat_sessions").select("id").eq("session_token", session_token).maybeSingle();
      sessionId = sessRow?.id ?? null;
    }

    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .insert({
        session_id: sessionId,
        client_id: botConfig.client_id,
        bot_id: botConfig.id,
        name, email, phone, message, transcript,
        source_url: source_url || "",
        status: "new",
        language: lang,
        ...(booking ? { booking, source: "hotel_quote" } : {}),
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
          emailSubject = booking ? hotelLeadSubject(booking as any, ownerLocale) : replaceSubjectVars(customTpl.subject, vars);
        } else {
          emailHtml = newLeadEmail(brand, {
            botName: botConfig.name, visitorName: name, visitorEmail: email,
            phone, message, sourceUrl: source_url, language: lang, transcript, dashboardUrl, booking: booking as any,
          }, ownerLocale);
          emailSubject = booking ? hotelLeadSubject(booking as any, ownerLocale) : newLeadSubject(name, botConfig.name, ownerLocale);
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
