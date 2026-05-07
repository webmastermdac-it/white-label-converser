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
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

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

    const { code, redirect_uri, bot_id, manual } = await req.json();

    // Fetch bot to verify ownership
    const { data: profile } = await admin
      .from("profiles").select("client_id").eq("id", claims.claims.sub).single();
    if (!profile?.client_id) return json({ error: "No client" }, 403);

    const { data: bot } = await admin
      .from("chatbot_configs").select("id, client_id").eq("id", bot_id).single();
    if (!bot || bot.client_id !== profile.client_id) {
      return json({ error: "Forbidden" }, 403);
    }

    // Manual mode: client passes pre-issued long-lived token directly
    if (manual) {
      const { access_token, page_id, username } = manual;
      await admin.from("chatbot_configs").update({
        instagram_access_token: access_token,
        instagram_page_id: page_id,
        instagram_username: username,
        instagram_connected: true,
        instagram_connected_at: new Date().toISOString(),
      }).eq("id", bot_id);
      return json({ success: true, username });
    }

    // OAuth code exchange flow
    const APP_ID = Deno.env.get("META_APP_ID");
    const APP_SECRET = Deno.env.get("META_APP_SECRET");
    if (!APP_ID || !APP_SECRET) {
      return json({ error: "Meta credentials not configured" }, 500);
    }

    // Exchange code for short-lived token
    const tokRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${code}`,
    );
    const tokJson = await tokRes.json();
    if (!tokJson.access_token) return json({ error: "Token exchange failed", detail: tokJson }, 400);

    // Long-lived token
    const llRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${tokJson.access_token}`,
    );
    const llJson = await llRes.json();
    const longToken = llJson.access_token || tokJson.access_token;

    // Get connected pages / IG account
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`,
    );
    const pagesJson = await pagesRes.json();
    const page = pagesJson.data?.[0];
    if (!page) return json({ error: "No Facebook page found" }, 400);

    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`,
    );
    const igJson = await igRes.json();
    const igAccount = igJson.instagram_business_account;
    if (!igAccount) return json({ error: "No Instagram Business account linked" }, 400);

    await admin.from("chatbot_configs").update({
      instagram_access_token: page.access_token,
      instagram_page_id: igAccount.id,
      instagram_username: igAccount.username,
      instagram_connected: true,
      instagram_connected_at: new Date().toISOString(),
    }).eq("id", bot_id);

    return json({ success: true, username: igAccount.username });
  } catch (e) {
    console.error("[ig-connect]", e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
