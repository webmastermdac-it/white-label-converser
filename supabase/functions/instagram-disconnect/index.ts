import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const { bot_id } = await req.json();

    const { data: profile } = await admin
      .from("profiles").select("client_id").eq("id", claims.claims.sub).single();
    if (!profile?.client_id) return json({ error: "No client" }, 403);

    const { data: bot } = await admin
      .from("chatbot_configs").select("client_id").eq("id", bot_id).single();
    if (!bot || bot.client_id !== profile.client_id) {
      return json({ error: "Forbidden" }, 403);
    }

    await admin.from("channel_secrets").delete().eq("bot_id", bot_id).eq("channel", "instagram");
    await admin.from("chatbot_configs").update({
      instagram_page_id: null,
      instagram_username: null,
      instagram_connected: false,
      instagram_connected_at: null,
    }).eq("id", bot_id);

    return json({ success: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
