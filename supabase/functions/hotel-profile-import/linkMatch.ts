export type SiteLink = { url: string; title: string; en: boolean };
export type ImportDiagnostics = { links_found: number; en_links_found: number; rooms_with_url: number; rooms_total: number };

export const KEYWORDS = /(camer|room|suite|servi|service|spa|ristorante|restaurant|offert|offer|contatt|contact)/i;
export const isEnLink = (u: URL) => /\/en(\/|$|[-_])/i.test(u.pathname) || /^en\./i.test(u.hostname) || /^en(-|$)/i.test(u.searchParams.get("lang") || "");

export function normalizeLinkName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const segment = (u: URL) => {
  const last = u.pathname.split("/").filter(Boolean).pop() || "";
  try { return normalizeLinkName(decodeURIComponent(last).replace(/\.(html?|php)$/i, "")); }
  catch { return normalizeLinkName(last); }
};

/** Never constructs a URL: every result is an entry in the discovered link list. */
export function matchLink(name: string, links: SiteLink[]): string {
  const normalized = normalizeLinkName(name);
  if (!normalized) return "";
  const candidates = links.filter((l) => !l.en).flatMap((link) => {
    const path = new URL(link.url).pathname;
    const values = [segment(new URL(link.url)), normalizeLinkName(link.title)];
    const exact = values.some((v) => v === normalized);
    const partial = values.some((v) => Math.min(v.length, normalized.length) >= 4 && (v.includes(normalized) || normalized.includes(v)));
    return exact || partial ? [{ link, exact, relevant: /\/(camer|room|suite|servizi|service)/i.test(path), length: path.length }] : [];
  });
  candidates.sort((a, b) => Number(b.exact) - Number(a.exact) || Number(b.relevant) - Number(a.relevant) || a.length - b.length || a.link.url.localeCompare(b.link.url));
  return candidates[0]?.link.url || "";
}

export function matchEnglishLink(url: string, links: SiteLink[]): string {
  if (!url || !links.some((l) => l.url === url && !l.en)) return "";
  const source = new URL(url);
  const slug = segment(source);
  const path = source.pathname.replace(/\/$/, "");
  return links.filter((l) => l.en).map((link) => ({ link, u: new URL(link.url) }))
    .filter(({ u }) => (slug && segment(u) === slug) || u.pathname.replace(/^\/en(?=\/|$)/i, "").replace(/\/$/, "") === path)
    .sort((a, b) => a.u.pathname.length - b.u.pathname.length || a.link.url.localeCompare(b.link.url))[0]?.link.url || "";
}

const decode = (value: string) => value.replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[\da-f]+|\d+);/gi, (entity) => {
  const named: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  const hex = /^&#x/i.test(entity);
  const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
});
const attr = (html: string, name: string) => decode(html.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find((v) => v !== undefined) || "").trim();

export function pageLink(href: string, title: string, base: URL): SiteLink | null {
  try {
    const u = new URL(decode(href), base);
    if (!/^https?:$/.test(u.protocol) || u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "") || u.username || u.password) return null;
    if (/\.(?:pdf|jpe?g|png|gif|webp|svg|ico|avif|bmp|tiff?)(?:$)/i.test(u.pathname)) return null;
    u.hash = "";
    return { url: u.href, title: decode(title).trim(), en: isEnLink(u) };
  } catch { return null; }
}

export function extractPageLinks(html: string, pageUrl: URL): SiteLink[] {
  const links: SiteLink[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(match[1], "href");
    if (!href || href.startsWith("#")) continue;
    const text = decode(match[2].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
    const img = match[2].match(/<img\b([^>]*)>/i)?.[1] || "";
    let title = text;
    const resolved = pageLink(href, "", pageUrl);
    if (!title || title === href || title === resolved?.url) title = attr(img, "alt") || attr(match[1], "title") || attr(match[1], "aria-label");
    const link = pageLink(href, title, pageUrl);
    if (link) links.push(link);
  }
  return links;
}

export function fillProposalLinks(proposal: Record<string, unknown>, links: SiteLink[], base: URL): ImportDiagnostics {
  const known = new Set(links.map((l) => l.url));
  const items = (key: string) => Array.isArray(proposal[key]) ? (proposal[key] as unknown[]).filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)) : [];
  for (const item of [...items("rooms"), ...items("services"), ...items("pages")]) {
    if (typeof item.url !== "string" || !known.has(item.url)) item.url = "";
    if (typeof item.url_en !== "string" || !links.some((l) => l.url === item.url_en && l.en)) item.url_en = "";
    if (!item.url && typeof item.name === "string") item.url = matchLink(item.name, links);
    if (!item.url_en) item.url_en = matchEnglishLink(String(item.url || ""), links);
  }
  const property = proposal.property && typeof proposal.property === "object" && !Array.isArray(proposal.property) ? proposal.property as Record<string, unknown> : {};
  if (typeof property.website !== "string" || (!known.has(property.website) && property.website !== base.origin && property.website !== `${base.origin}/`)) property.website = base.origin;
  if (typeof property.website_en !== "string" || !links.some((l) => l.url === property.website_en && l.en)) {
    property.website_en = links.find((l) => l.en && /^(?:\/en)?\/?$/i.test(new URL(l.url).pathname))?.url || "";
  }
  proposal.property = property;
  const rooms = items("rooms");
  return { links_found: links.length, en_links_found: links.filter((l) => l.en).length, rooms_with_url: rooms.filter((r) => !!r.url).length, rooms_total: rooms.length };
}