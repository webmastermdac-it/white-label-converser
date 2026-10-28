import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { isWithinServiceHours, normalizeServiceHours } from "../_shared/serviceHours.ts";
import { canFollowUp } from "../_shared/requestThread.ts";
import { emailShell, escHtml, fetchBrandSettings } from "../_shared/email-template.ts";

// Public endpoint used by the guest widget: the guest wrote again on a request it already created.
// The message joins the same thread and the request goes back to "open" so the staff sees it.
// Request ids are unguessable UUIDs kept in the guest's browser (same model as service-request-replies).
const BodySchema = z.object({
  embed_token: z.string().regex(/^[a-f0-9]{16,128}$/i),
  request_id: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
});

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return reply({ error: "Invalid request" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: bot } = await admin.from("chatbot_configs")
      .select("id, client_id, name, business_vertical, is_active, hotel_profile, notification_email, email_notifications_enabled")
      .eq("embed_token", parsed.data.embed_token).maybeSingle();
    if (!bot || !bot.is_active || bot.business_vertical !== "hotel") return reply({ error: "Not found" }, 404);

    const { data: client } = await admin.from("clients").select("plan").eq("id", bot.client_id).single();
    const { data: plan } = await admin.from("plan_configs").select("concierge_requests")
      .eq("plan_name", client?.plan || "free").single();
    if (!plan?.concierge_requests) return reply({ error: "plan_required" }, 403);

    const { data: request } = await admin.from("service_requests")
      .select("id, room, category, status, created_at, resolved_at")
      .eq("id", parsed.data.request_id).eq("bot_id", bot.id).maybeSingle();
    if (!request) return reply({ error: "Not found" }, 404);
    // Closed for more than 24 hours: the widget opens a new request instead.
    if (!canFollowUp(request)) return reply({ error: "expired" }, 409);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("service_request_messages").select("id", { count: "exact", head: true })
      .eq("request_id", request.id).eq("author", "guest").gte("created_at", since);
    if ((count || 0) >= 20) return reply({ error: "rate_limit" }, 429);

    const now = new Date().toISOString();
    const { error: insertError } = await admin.from("service_request_messages").insert({
      request_id: request.id, bot_id: bot.id, client_id: bot.client_id, author: "guest", body: parsed.data.message, created_at: now,
    });
    if (insertError) throw insertError;

    // Back to "open" so it returns to "To handle" and the lamp reacts; the timestamp marks the guest reply.
    const { error: updateError } = await admin.from("service_requests")
      .update({ status: "open", resolved_at: null, last_guest_message_at: now }).eq("id", request.id);
    if (updateError) throw updateError;

    if (bot.email_notifications_enabled && bot.notification_email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const brand = await fetchBrandSettings(admin);
        const appUrl = (Deno.env.get("APP_URL") || "").replace(/\/$/, "");
        const body = `<h1 style="margin:0 0 4px;font-size:24px;color:#1A1A1A;">Replica dell'ospite</h1>
          <p style="margin:0 0 20px;color:#888888;">${escHtml(bot.name)}</p>
          <div style="background:#F5F5F5;border-radius:8px;padding:16px;">
            <p><strong>Camera:</strong> ${escHtml(request.room)}</p><p><strong>Richiesta:</strong> ${escHtml(request.category)}</p>
            <p><strong>Messaggio:</strong> ${escHtml(parsed.data.message)}</p>
          </div>${appUrl ? `<p style="margin-top:24px;text-align:center;"><a href="${escHtml(appUrl)}/dashboard/hotel/requests" style="color:${escHtml(brand.primary_color)};font-weight:700;">Apri richieste ospiti</a></p>` : ""}`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${brand.app_name} <noreply@chatbot.your-genius.com>`,
            to: [bot.notification_email],
            subject: `Camera ${request.room}: replica dell'ospite`,
            html: emailShell(brand, body),
          }),
        }).catch((e) => console.error("followup email error:", e));
      }
    }

    const afterHours = !isWithinServiceHours(bot.hotel_profile?.service_hours);
    return reply({
      success: true, request_id: request.id,
      after_hours: afterHours,
      opens_at: afterHours ? normalizeServiceHours(bot.hotel_profile?.service_hours).start : null,
    });
  } catch (error) {
    console.error("service-request-followup error:", error);
    return reply({ error: "Server error" }, 500);
  }
});
