const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode, url, urls } = body;

    if (mode === "analyze" && url) {
      return await analyzeSite(url);
    }

    if (mode === "scrape" && urls?.length) {
      return await scrapePages(urls);
    }

    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function analyzeSite(url: string) {
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

  const baseHostname = new URL(formattedUrl).hostname;
  const visited = new Set<string>();
  const allLinks: { url: string; title: string }[] = [];

  const res1 = await fetch(formattedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GeniusBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res1.ok) throw new Error(`Failed to fetch: ${res1.status}`);

  const html1 = await res1.text();
  const mainContent = extractMainContent(html1);
  const level1Links = extractLinks(html1, formattedUrl);

  visited.add(formattedUrl);
  for (const link of level1Links) {
    if (!visited.has(link.url)) {
      allLinks.push(link);
      visited.add(link.url);
    }
  }

  await Promise.all(level1Links.slice(0, 8).map(async (page) => {
    try {
      const res2 = await fetch(page.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GeniusBot/1.0)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res2.ok) return;

      const html2 = await res2.text();
      const deeper = extractLinks(html2, formattedUrl);

      for (const link of deeper) {
        if (!visited.has(link.url) && new URL(link.url).hostname === baseHostname) {
          allLinks.push(link);
          visited.add(link.url);
        }
      }
    } catch { /* skip */ }
  }));

  return new Response(
    JSON.stringify({ content: mainContent, links: allLinks.slice(0, 100) }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function scrapePages(urls: string[]) {
  const contents: string[] = [];

  for (const url of urls.slice(0, 50)) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GeniusBot/1.0)" },
      });

      if (response.ok) {
        const html = await response.text();
        const text = extractMainContent(html);
        if (text.trim()) {
          contents.push(`--- ${url} ---\n${text}`);
        }
      }
    } catch (e) {
      console.error(`Failed to scrape ${url}:`, e);
    }
  }

  return new Response(
    JSON.stringify({ contents }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function extractMainContent(html: string): string {
  // Remove script, style, nav, footer, header tags
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Before stripping tags, add space around inline elements to prevent word merging
  text = text.replace(/<\/(span|a|strong|em|b|i|label|button|td|th|li)>/gi, " $0");
  text = text.replace(/<(br|hr)[^>]*>/gi, "\n");
  // Then strip all remaining tags
  text = text.replace(/<[^>]+>/g, "");
  // Collapse multiple spaces
  text = text.replace(/ {2,}/g, " ");
  // Decode entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Clean whitespace
  text = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

  // Truncate
  if (text.length > 30000) {
    text = text.slice(0, 30000) + "\n\n[...troncato...]";
  }

  return text;
}

function extractLinks(html: string, baseUrl: string): { url: string; title: string }[] {
  const linkRegex = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const links: { url: string; title: string }[] = [];

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1].trim();
    const title = match[2].replace(/<[^>]+>/g, "").trim();

    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl).href;
      const base = new URL(baseUrl);
      const link = new URL(resolved);

      // Only same-domain links
      if (link.hostname !== base.hostname) continue;
      if (seen.has(resolved)) continue;

      seen.add(resolved);
      links.push({ url: resolved, title: title || resolved });
    } catch {
      // skip invalid URLs
    }
  }

  return links.slice(0, 100);
}
