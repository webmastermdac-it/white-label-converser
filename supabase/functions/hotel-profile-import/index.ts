import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { KEYWORDS, pageLink, extractPageLinks, fillProposalLinks, type SiteLink } from "./linkMatch.ts";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ bot_id: z.string().uuid() });

const PROMPT = `Sei un assistente che estrae dati di una struttura ricettiva dal testo del suo sito.
Rispondi SOLO con un oggetto JSON con questa struttura (ometti o lascia stringa vuota ciò che non trovi, NON inventare nulla):
{"property":{"name":"","type":"hotel|bnb|resort|agriturismo|appartamenti","stars":0,"address":"","phone":"","email":"","checkin_from":"HH:MM","checkin_to":"HH:MM","checkout_until":"HH:MM","reception_hours":"","languages":[],"website":"","website_en":""},
"rooms":[{"name":"","description":"","max_adults":0,"max_children":0,"size_m2":0,"beds":"","amenities":[],"price_from":0,"image_url":"","url":"","url_en":""}],
"services":[{"name":"","description":"","hours":"","price":"","included":false,"url":"","url_en":""}],
"policies":{"cancellation":"","children":"","pets":"","late_checkout":"","early_checkin":"","city_tax":"","payment_methods":"","parking":""},
"local_guide":[{"category":"ristorante|attrazione|trasporti|spiaggia|shopping|altro","name":"","description":"","distance":"","link":""}],
"pages":[{"name":"","url":"","url_en":""}]}
Gli URL ("url" di camere e servizi, "url" di pages) vanno scelti SOLO dalla lista LINK REALI DEL SITO, per corrispondenza certa di nome/slug con la camera o il servizio; se non c'è una corrispondenza certa lascia stringa vuota. Non inventare MAI URL e non modificarli.
"pages" contiene le pagine principali del sito trovate nella lista (camere, servizi, contatti, ristorante, spa, offerte...), con nome breve e URL esatto. Imposta "website" sull'URL del sito principale.
Nella lista i link marcati [EN] sono versioni inglesi: per ogni camera/servizio/pagina metti in "url" il link italiano/di default e in "url_en" l'equivalente inglese marcato [EN]; "website_en" è la home inglese. Se non esiste l'equivalente EN nella lista lascia "url_en" vuoto. Mai inventare link.
Usa la lingua del sito. Massimo 15 camere, 20 servizi, 15 voci guida, 15 pagine.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Missing backend configuration" }, 500);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (cErr || !userId) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const admin = createClient(url, serviceKey);
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
    const base = new URL(/^https?:\/\//i.test(bot.site_url) ? bot.site_url : `https://${bot.site_url}`);
    const discovered = new Map<string, SiteLink>();
    const addLink = (link: SiteLink | null) => {
      if (!link) return;
      const existing = discovered.get(link.url);
      if (!existing || ((!existing.title || existing.title === existing.url) && link.title && link.title !== link.url)) discovered.set(link.url, link);
    };
    for (const l of (home.links || []) as { url: string; title?: string }[]) {
      addLink(pageLink(l.url, l.title || "", base));
    }
    const download = async (target: string) => {
      const response = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GeniusBot/1.0)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error(`fetch ${response.status}`);
      if (new URL(response.url).hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) throw new Error("Off-host redirect");
      return { text: await response.text(), url: new URL(response.url) };
    };
    // Read actual room/service listing HTML, not just its text, to discover detail pages.
    const listingPages = [...discovered.values()].filter((l) => KEYWORDS.test(l.url + " " + l.title)).slice(0, 6);
    const listings = await Promise.all(listingPages.map(async (l) => {
      try { return await download(l.url); } catch { return null; }
    }));
    for (const page of listings) {
      if (page) for (const link of extractPageLinks(page.text, page.url)) addLink(pageLink(link.url, link.title, base));
    }
    if (discovered.size < 5) {
      const visitedSitemaps = new Set<string>();
      const readSitemap = async (target: string, depth: number): Promise<void> => {
        if (depth > 2 || visitedSitemaps.has(target) || visitedSitemaps.size >= 20 || discovered.size >= 300) return;
        visitedSitemaps.add(target);
        try {
          const { text } = await download(target);
          const isIndex = /<sitemapindex\b/i.test(text);
          for (const m of text.matchAll(/<loc\b[^>]*>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/loc>/gi)) {
            const link = pageLink(m[1].trim(), "", base);
            if (!link) continue;
            if (isIndex || /\.xml$/i.test(new URL(link.url).pathname)) await readSitemap(link.url, depth + 1);
            else addLink(link);
            if (discovered.size >= 300) break;
          }
        } catch { /* optional sitemap unavailable */ }
      };
      await readSitemap(`${base.origin}/sitemap.xml`, 0);
    }
    const priority = (l: SiteLink) => Number(KEYWORDS.test(l.url + " " + l.title) || /\/en\//i.test(new URL(l.url).pathname));
    const realLinks = [...discovered.values()].sort((a, b) => priority(b) - priority(a)).slice(0, 300);
    const extra = realLinks.filter((l) => KEYWORDS.test(l.url + " " + l.title)).slice(0, 8).map((l) => l.url);
    const more = extra.length ? await call({ mode: "scrape", urls: extra }).catch(() => ({ contents: [] })) : { contents: [] };
    const text = [home.content || "", ...(more.contents || [])].join("\n\n").slice(0, 45000);
    const linksBlock = `LINK REALI DEL SITO (sito principale: ${base.origin}/):\n` + (realLinks.length ? realLinks.map((l) => `- ${l.en ? "[EN] " : ""}${l.title || "-"}: ${l.url}`).join("\n") : "(nessuno)");
    if (!text.trim()) return json({ error: "empty_site" }, 422);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);
    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: PROMPT }, { role: "user", content: `${linksBlock}\n\nTESTO DEL SITO:\n${text}` }],
      }),
    });
    if (!ai.ok) {
      const t = await ai.text();
      console.error("AI error", ai.status, t);
      return json({ error: "ai_error", status: ai.status, details: t.slice(0, 300) }, ai.status);
    }
    const data = await ai.json();
    let proposal: Record<string, unknown> = {};
    try { proposal = JSON.parse(data.choices?.[0]?.message?.content || "{}"); } catch { return json({ error: "ai_parse" }, 502); }
    if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) return json({ error: "ai_parse" }, 502);
    const diagnostics = fillProposalLinks(proposal, realLinks, base);
    return json({ proposal, diagnostics });
  } catch (e) {
    console.error("hotel-profile-import", e);
    return json({ error: (e as Error).message }, 500);
  }
});
