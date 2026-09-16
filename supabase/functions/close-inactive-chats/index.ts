import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  fetchBrandSettings,
  chatEndedRecapEmail,
  chatEndedRecapSubject,
  resolveClientOwnerLocale,
} from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Open sessions with their bot config
    const { data: sessions, error } = await supabase
      .from("chat_sessions")
      .select("id, client_id, bot_id, messages, started_at, last_message_at, source_url, chatbot_configs!inner(id, name, notification_email, email_notifications_enabled, notify_new_chat_enabled, inactivity_timeout_minutes)")
      .is("ended_at", null)
      .limit(500);

    if (error) throw error;

    const now = Date.now();
    let closed = 0;
    let emailsSent = 0;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let brand: any = null;

    for (const s of (sessions || []) as any[]) {
      const bot = s.chatbot_configs;
      if (!bot) continue;
      const timeout = bot.inactivity_timeout_minutes ?? 30;
      const last = new Date(s.last_message_at).getTime();
      if (now - last < timeout * 60_000) continue;

      const { error: upErr } = await supabase
        .from("chat_sessions")
        .update({ ended_at: s.last_message_at })
        .eq("id", s.id);
      if (upErr) {
        console.error("close error", s.id, upErr);
        continue;
      }
      closed++;

      if (!bot.notify_new_chat_enabled || !bot.email_notifications_enabled || !bot.notification_email) continue;
      if (!RESEND_API_KEY) continue;

      // Same plan gating pattern as lead emails: respect the client's monthly conversation allowance
      let limitReached = false;
      try {
        const { data: clientData } = await supabase
          .from("clients").select("plan").eq("id", s.client_id).single();
        const plan = clientData?.plan || "free";
        const { data: planConfig } = await supabase
          .from("plan_configs").select("max_conversations_month").eq("plan_name", plan).single();
        const maxConv = planConfig?.max_conversations_month ?? -1;
        if (maxConv !== -1) {
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          const { count } = await supabase
            .from("chat_sessions")
            .select("id", { count: "exact", head: true })
            .eq("client_id", s.client_id)
            .gte("started_at", monthStart.toISOString());
          if ((count || 0) > maxConv) limitReached = true;
        }
      } catch (_) {}
      if (limitReached) continue;

      if (!brand) brand = await fetchBrandSettings(supabase);
      const locale = await resolveClientOwnerLocale(supabase, s.client_id);
      const messageCount = Array.isArray(s.messages) ? s.messages.length : 0;
      const durationMinutes = Math.max(
        1,
        Math.round((new Date(s.last_message_at).getTime() - new Date(s.started_at).getTime()) / 60000),
      );

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${brand.app_name} <noreply@chatbot.your-genius.com>`,
            to: [bot.notification_email],
            subject: chatEndedRecapSubject(messageCount, bot.name, locale),
            html: chatEndedRecapEmail(brand, {
              botName: bot.name,
              messageCount,
              durationMinutes,
              sourceUrl: s.source_url || "",
              dashboardUrl: "https://white-label-converser.lovable.app/dashboard/chats",
            }, locale),
          }),
        });
        emailsSent++;
      } catch (e) {
        console.error("recap email error", e);
      }
    }

    return new Response(JSON.stringify({ success: true, sessions_closed: closed, emails_sent: emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("close-inactive-chats error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
