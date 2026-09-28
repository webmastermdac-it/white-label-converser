import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Only the fields actually read by public/widget.js
const FIELDS =
  "name, avatar, primary_color, background_color, text_color, circle_color, launcher_position, welcome_message, welcome_msg_it, welcome_msg_en, messages_i18n, calendly_url, booking_button_label, lead_form_mode, lead_form_message_count, business_vertical, hotel_profile, client_id";

function json(body: unknown, status = 200, cache = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": cache ? "public, max-age=60" : "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let token: string | null = new URL(req.url).searchParams.get("embed_token");
  if (!token && req.method === "POST") {
    try { token = (await req.json())?.embed_token ?? null; } catch { /* ignore */ }
  }
  if (typeof token !== "string" || !/^[a-f0-9]{16,128}$/i.test(token)) {
    return json({ error: "Invalid embed_token" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin
    .from("chatbot_configs")
    .select(FIELDS)
    .eq("embed_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return json({ error: "Server error" }, 500);
  if (!data) return json({ error: "Not found" }, 404);
  const { business_vertical, hotel_profile, ...base } = data as any;
  // Extra fields ONLY for hotel bots — other modules get exactly the previous payload
  if (business_vertical === "hotel") {
    const hp = hotel_profile || {};
    const { data: client } = await admin.from("clients").select("plan").eq("id", (data as any).client_id).single();
    const { data: plan } = await admin.from("plan_configs").select("concierge_requests").eq("plan_name", client?.plan || "free").single();
    const rooms = (Array.isArray(hp.rooms) ? hp.rooms : [])
      .filter((r: any) => r && r.id && r.name)
      .map((r: any) => ({ id: String(r.id), name: String(r.name) }));
    const { client_id: _clientId, ...safeBase } = base as any;
    const defaultQuickReplies = ["Pulizia/asciugamani", "Late check-out", "Taxi/transfer", "Ristorante", "Problema in camera", "Altro"];
    const configuredQuickReplies = Array.isArray(hp.in_stay_quick_replies)
      ? hp.in_stay_quick_replies.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 12)
      : [];
    return json({
      ...safeBase,
      business_vertical: "hotel",
      hotel: {
        property_name: hp.property?.name || base.name,
        rooms,
        engine_url_template: hp.booking?.engine_url_template || "",
        date_format: hp.booking?.date_format === "DD/MM/YYYY" ? "DD/MM/YYYY" : "YYYY-MM-DD",
        concierge_requests: !!plan?.concierge_requests,
        in_stay_quick_replies: plan?.concierge_requests ? (configuredQuickReplies.length ? configuredQuickReplies : defaultQuickReplies) : [],
      },
    }, 200, true);
  }
  const { client_id: _clientId, ...safeBase } = base as any;
  return json(safeBase, 200, true);
});
