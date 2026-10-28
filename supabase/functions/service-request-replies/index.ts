import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";

// Public endpoint used by the guest widget: returns the property's replies for the
// requests the guest itself created (request ids are unguessable UUIDs kept in the guest's browser).
const BodySchema = z.object({
  embed_token: z.string().regex(/^[a-f0-9]{16,128}$/i),
  ids: z.array(z.string().uuid()).min(1).max(20),
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
    const { data: bot } = await admin.from("chatbot_configs").select("id, business_vertical")
      .eq("embed_token", parsed.data.embed_token).maybeSingle();
    if (!bot || bot.business_vertical !== "hotel") return reply({ error: "Not found" }, 404);
    const { data, error } = await admin.from("service_requests")
      .select("id, status, staff_reply, replied_at")
      .eq("bot_id", bot.id).in("id", parsed.data.ids);
    if (error) throw error;
    // Every staff message of the thread, oldest first (the guest only ever sees the property's side here).
    const { data: messages, error: messagesError } = await admin.from("service_request_messages")
      .select("id, request_id, body, closes_request, created_at")
      .eq("bot_id", bot.id).eq("author", "staff").in("request_id", parsed.data.ids)
      .order("created_at", { ascending: true });
    if (messagesError) throw messagesError;
    return reply({
      // staff_reply / replied_at stay in the payload so widget copies cached before this change keep working.
      requests: (data || []).map((r) => ({ ...r, messages: (messages || []).filter((m) => m.request_id === r.id) })),
    });
  } catch (error) {
    console.error("service-request-replies error:", error);
    return reply({ error: "Server error" }, 500);
  }
});
