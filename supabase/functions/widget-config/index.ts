import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Only the fields actually read by public/widget.js
const FIELDS =
  "name, avatar, primary_color, welcome_message, welcome_msg_it, welcome_msg_en, calendly_url, lead_form_mode, lead_form_message_count";

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
  return json(data, 200, true);
});
