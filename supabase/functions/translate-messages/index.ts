import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGS = ["en", "fr", "de", "es"] as const;
const Body = z.object({
  welcome: z.string().max(2000),
  fallback: z.string().max(2000),
  targets: z.array(z.enum(LANGS)).min(1).max(4),
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
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { welcome, fallback, targets } = parsed.data;

    const system =
      "You are a professional translator. Translate the given Italian chatbot messages into each requested language. " +
      "Keep the same tone, emojis and approximate length. Translate only, no comments. " +
      'Reply ONLY with JSON: {"<lang>": {"welcome": "...", "fallback": "..."}} for each requested language code.';
    const user = JSON.stringify({ languages: targets, welcome, fallback });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) return json({ error: "Troppe richieste, riprova tra poco / Too many requests, try again shortly" }, 429);
    if (res.status === 402) return json({ error: "Crediti AI esauriti / AI credits exhausted" }, 402);
    if (!res.ok) {
      console.error("[translate-messages] gateway", res.status, await res.text());
      return json({ error: `AI error ${res.status}` }, 502);
    }
    const data = await res.json();
    let out: Record<string, { welcome?: string; fallback?: string }> = {};
    try { out = JSON.parse(data.choices?.[0]?.message?.content || "{}"); } catch { /* */ }
    const translations: Record<string, { welcome: string; fallback: string }> = {};
    for (const l of targets) {
      const t = out[l];
      if (t && typeof t.welcome === "string" && typeof t.fallback === "string") translations[l] = { welcome: t.welcome, fallback: t.fallback };
    }
    if (!Object.keys(translations).length) return json({ error: "Traduzione non valida / Invalid translation" }, 502);
    return json({ translations });
  } catch (e) {
    console.error("[translate-messages]", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
