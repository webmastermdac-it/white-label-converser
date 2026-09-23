import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  bot_id: z.string().uuid(),
  channel: z.enum(["instagram"]),
  access_token: z.string().min(10).max(2000),
  page_id: z.string().min(1).max(100),
  username: z.string().max(100).optional(),
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (cErr || !userId) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { bot_id, channel, access_token, page_id, username } = parsed.data;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [{ data: profile }, { data: isAdmin }, { data: bot }] = await Promise.all([
      admin.from("profiles").select("client_id").eq("id", userId).maybeSingle(),
      admin.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      admin.from("chatbot_configs").select("id, client_id").eq("id", bot_id).maybeSingle(),
    ]);
    if (!bot) return json({ error: "Not found" }, 404);
    if (!isAdmin && (!profile?.client_id || profile.client_id !== bot.client_id)) {
      return json({ error: "Forbidden" }, 403);
    }

    const { error: sErr } = await admin.from("channel_secrets").upsert(
      { bot_id, channel, access_token, updated_at: new Date().toISOString() },
      { onConflict: "bot_id,channel" },
    );
    if (sErr) throw sErr;

    const { error: uErr } = await admin.from("chatbot_configs").update({
      instagram_page_id: page_id,
      instagram_username: username || "instagram_user",
      instagram_connected: true,
      instagram_connected_at: new Date().toISOString(),
    }).eq("id", bot_id);
    if (uErr) throw uErr;

    return json({ success: true, username: username || "instagram_user" });
  } catch (e) {
    console.error("[save-channel-secret]", e);
    return json({ error: "Server error" }, 500);
  }
});
