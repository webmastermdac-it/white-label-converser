import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { emailShell, escHtml, fetchBrandSettings } from "../_shared/email-template.ts";

const BodySchema = z.object({
  embed_token: z.string().regex(/^[a-f0-9]{16,128}$/i),
  room: z.string().trim().max(40).optional().default(""),
  category: z.string().trim().min(1).max(80),
  message: z.string().trim().max(1000).optional().default(""),
  guest_name: z.string().trim().max(120).optional().default(""),
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
    if (!parsed.success) return reply({ error: parsed.error.flatten().fieldErrors }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: bot } = await admin.from("chatbot_configs")
      .select("id, client_id, name, business_vertical, is_active, hotel_profile, notification_email, email_notifications_enabled")
      .eq("embed_token", parsed.data.embed_token).maybeSingle();
    if (!bot || !bot.is_active || bot.business_vertical !== "hotel") return reply({ error: "Not found" }, 404);

    const { data: client } = await admin.from("clients").select("plan").eq("id", bot.client_id).single();
    const { data: plan } = await admin.from("plan_configs").select("concierge_requests")
      .eq("plan_name", client?.plan || "free").single();
    if (!plan?.concierge_requests) return reply({ error: "plan_required" }, 403);

    const configured = Array.isArray(bot.hotel_profile?.in_stay_quick_replies)
      ? bot.hotel_profile.in_stay_quick_replies.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
    const defaults = ["Pulizia/asciugamani", "Late check-out", "Taxi/transfer", "Ristorante", "Problema in camera", "Altro"];
    if (![...(configured.length ? configured : defaults)].includes(parsed.data.category)) {
      return reply({ error: "Invalid category" }, 400);
    }

    const room = parsed.data.room || "Reception";
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("service_requests").select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id).eq("room", room).gte("created_at", since);
    if ((count || 0) >= 10) return reply({ error: "rate_limit" }, 429);

    const { data: created, error } = await admin.from("service_requests").insert({
      bot_id: bot.id,
      client_id: bot.client_id,
      room,
      category: parsed.data.category,
      message: parsed.data.message || null,
      guest_name: parsed.data.guest_name || null,
    }).select("id").single();
    if (error) throw error;

    if (bot.email_notifications_enabled && bot.notification_email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const brand = await fetchBrandSettings(admin);
        const appUrl = (Deno.env.get("APP_URL") || "").replace(/\/$/, "");
        const body = `<h1 style="margin:0 0 4px;font-size:24px;color:#1A1A1A;">Nuova richiesta ospite</h1>
          <p style="margin:0 0 20px;color:#888888;">${escHtml(bot.name)}</p>
          <div style="background:#F5F5F5;border-radius:8px;padding:16px;">
            <p><strong>Camera:</strong> ${escHtml(room)}</p><p><strong>Categoria:</strong> ${escHtml(parsed.data.category)}</p>
            ${parsed.data.guest_name ? `<p><strong>Ospite:</strong> ${escHtml(parsed.data.guest_name)}</p>` : ""}
            ${parsed.data.message ? `<p><strong>Messaggio:</strong> ${escHtml(parsed.data.message)}</p>` : ""}
          </div>${appUrl ? `<p style="margin-top:24px;text-align:center;"><a href="${escHtml(appUrl)}/dashboard/hotel/requests" style="color:${escHtml(brand.primary_color)};font-weight:700;">Apri richieste ospiti</a></p>` : ""}`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${brand.app_name} <noreply@chatbot.your-genius.com>`,
            to: [bot.notification_email],
            subject: `Camera ${room}: ${parsed.data.category}`,
            html: emailShell(brand, body),
          }),
        });
      }
    }

    return reply({ success: true, request_id: created.id });
  } catch (error) {
    console.error("create-service-request error:", error);
    return reply({ error: "Server error" }, 500);
  }
});