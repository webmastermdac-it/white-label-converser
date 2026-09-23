import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ bot_id: z.string().uuid() });
const KEYWORDS = /(camer|room|suite|contatt|contact|serviz|service|prezz|price|dove|where|about|chi-siamo|policy|condizion|faq|colazion|breakfast|spa|ristorante|restaurant)/i;

const PROMPT = `Sei un assistente che estrae dati di una struttura ricettiva dal testo del suo sito.
Rispondi SOLO con un oggetto JSON con questa struttura (ometti o lascia stringa vuota ciò che non trovi, NON inventare nulla):
{"property":{"name":"","type":"hotel|bnb|resort|agriturismo|appartamenti","stars":0,"address":"","phone":"","email":"","checkin_from":"HH:MM","checkin_to":"HH:MM","checkout_until":"HH:MM","reception_hours":"","languages":[]},
"rooms":[{"name":"","description":"","max_adults":0,"max_children":0,"size_m2":0,"beds":"","amenities":[],"price_from":0,"image_url":""}],
"services":[{"name":"","description":"","hours":"","price":"","included":false}],
"policies":{"cancellation":"","children":"","pets":"","late_checkout":"","early_checkin":"","city_tax":"","payment_methods":"","parking":""},
"local_guide":[{"category":"ristorante|attrazione|trasporti|spiaggia|shopping|altro","name":"","description":"","distance":"","link":""}]}
Usa la lingua del sito. Massimo 15 camere, 20 servizi, 15 voci guida.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (cErr || !userId) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [{ data: profile }, { data: isAdmin }, { data: bot }] = await Promise.all([
      admin.from("profiles").select("client_id").eq("id", userId).maybeSingle(),
      admin.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      admin.from("chatbot_configs").select("id, client_id, site_url").eq("id", parsed.data.bot_id).maybeSingle(),
    ]);
    if (!bot) return json({ error: "Not found" }, 404);
    if (!isAdmin && profile?.client_id !== bot.client_id) return json({ error: "Forbidden" }, 403);
    if (!bot.site_url) return json({ error: "missing_site_url" }, 400);

    // Reuse the existing scrape-website function
    const call = (body: unknown) => fetch(`${url}/functions/v1/scrape-website`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
      body: JSON.stringify(body),
    }).then((r) => r.ok ? r.json() : Promise.reject(new Error(`scrape ${r.status}`)));

    const home = await call({ mode: "analyze", url: bot.site_url });
    const extra = (home.links || []).filter((l: { url: string; title: string }) => KEYWORDS.test(l.url + " " + l.title)).slice(0, 6).map((l: { url: string }) => l.url);
    const more = extra.length ? await call({ mode: "scrape", urls: extra }).catch(() => ({ contents: [] })) : { contents: [] };
    const text = [home.content || "", ...(more.contents || [])].join("\n\n").slice(0, 45000);
    if (!text.trim()) return json({ error: "empty_site" }, 422);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);
    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: PROMPT }, { role: "user", content: text }],
      }),
    });
    if (!ai.ok) {
      const t = await ai.text();
      console.error("AI error", ai.status, t);
      return json({ error: "ai_error", status: ai.status, details: t.slice(0, 300) }, ai.status);
    }
    const data = await ai.json();
    let proposal: unknown = {};
    try { proposal = JSON.parse(data.choices?.[0]?.message?.content || "{}"); } catch { return json({ error: "ai_parse" }, 502); }
    return json({ proposal });
  } catch (e) {
    console.error("hotel-profile-import", e);
    return json({ error: (e as Error).message }, 500);
  }
});
