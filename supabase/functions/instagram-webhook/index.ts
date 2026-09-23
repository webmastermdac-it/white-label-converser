import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN = Deno.env.get("INSTAGRAM_VERIFY_TOKEN") || "genius_chatbot_verify";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // ── Webhook verification (GET) ──
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge || "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ── Incoming messages (POST) ──
  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    for (const entry of body.entry || []) {
      const pageId = entry.id;
      const messaging = entry.messaging || [];

      // Find bot by instagram_page_id
      const { data: botRow } = await supabase
        .from("chatbot_configs")
        .select("id, client_id, embed_token, instagram_connected")
        .eq("instagram_page_id", pageId)
        .eq("instagram_connected", true)
        .maybeSingle();

      if (!botRow) {
        console.log(`[ig-webhook] no bot for page ${pageId}`);
        continue;
      }

      const { data: secret } = await supabase
        .from("channel_secrets")
        .select("access_token")
        .eq("bot_id", botRow.id)
        .eq("channel", "instagram")
        .maybeSingle();
      const bot = { ...botRow, instagram_access_token: secret?.access_token ?? null };

      for (const event of messaging) {
        const senderId = event.sender?.id;
        const messageText = event.message?.text;
        if (!senderId || !messageText || event.message?.is_echo) continue;

        // Save inbound
        await supabase.from("instagram_messages").insert({
          client_id: bot.client_id,
          bot_id: bot.id,
          instagram_sender_id: senderId,
          direction: "inbound",
          message: messageText,
        });

        // Build short conversation history from recent messages
        const { data: history } = await supabase
          .from("instagram_messages")
          .select("direction, message")
          .eq("client_id", bot.client_id)
          .eq("instagram_sender_id", senderId)
          .order("created_at", { ascending: false })
          .limit(10);

        const conv = (history || []).reverse().map((m: any) => ({
          role: m.direction === "inbound" ? "user" : "assistant",
          content: m.message,
        }));

        // Call existing chat function
        const chatRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              messages: conv,
              embed_token: bot.embed_token,
              source_url: "instagram://dm",
              language: "it",
            }),
          },
        );

        let replyText = "Grazie per il messaggio! Ti risponderemo a breve.";
        try {
          const chatJson = await chatRes.json();
          replyText = chatJson.message || chatJson.reply || chatJson.content || replyText;
        } catch (_) {}

        // Send reply via Instagram Graph API
        if (bot.instagram_access_token) {
          await fetch(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${bot.instagram_access_token}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: replyText },
              }),
            },
          ).catch((e) => console.error("[ig-webhook] send error", e));
        }

        await supabase.from("instagram_messages").insert({
          client_id: bot.client_id,
          bot_id: bot.id,
          instagram_sender_id: senderId,
          direction: "outbound",
          message: replyText,
        });
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (e) {
    console.error("[ig-webhook]", e);
    return new Response("ok", { status: 200 });
  }
});
