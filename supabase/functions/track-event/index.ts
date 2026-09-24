import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const ALLOWED_EVENTS = new Set(["booking_click"]);
const UUID = /^[0-9a-f-]{36}$/i;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { embed_token, session_id, event, lead_id } = body || {};
  if (typeof embed_token !== "string" || !/^[a-f0-9]{16,128}$/i.test(embed_token)) return json({ error: "Invalid embed_token" }, 400);
  if (typeof session_id !== "string" || session_id.length < 8 || session_id.length > 100) return json({ error: "Invalid session_id" }, 400);
  if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) return json({ error: "Invalid event" }, 400);
  if (lead_id != null && (typeof lead_id !== "string" || !UUID.test(lead_id))) return json({ error: "Invalid lead_id" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: bot } = await admin.from("chatbot_configs").select("id, client_id")
    .eq("embed_token", embed_token).eq("is_active", true).maybeSingle();
  if (!bot) return json({ error: "Not found" }, 404);

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("widget_events").select("id", { count: "exact", head: true })
    .eq("session_id", session_id).gte("created_at", since);
  if ((count || 0) >= 60) return json({ error: "Rate limited" }, 429);

  let safeLead: string | null = null;
  if (lead_id) {
    const { data: lead } = await admin.from("leads").select("id").eq("id", lead_id).eq("bot_id", bot.id).maybeSingle();
    safeLead = lead?.id ?? null;
  }
  const { error } = await admin.from("widget_events").insert({
    bot_id: bot.id, client_id: bot.client_id, session_id, lead_id: safeLead, event, meta: {},
  });
  if (error) return json({ error: "Server error" }, 500);
  return json({ ok: true });
});
