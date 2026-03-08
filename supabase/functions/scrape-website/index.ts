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
  if (!formattedUrl.startsWith("http")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const response = await fetch(formattedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GeniusBot/1.0)" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const html = await response.text();
  const content = extractMainContent(html);
  const homepageLinks = extractLinks(html, formattedUrl);

  // Shallow 2-level crawl: fetch up to 15 discovered pages to find more links
  const allLinks = new Map<string, string>();
  for (const link of homepageLinks) {
    allLinks.set(link.url, link.title);
  }

  const level2Urls = homepageLinks.slice(0, 15);
  const level2Promises = level2Urls.map(async (link) => {
    try {
      const res = await fetch(link.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GeniusBot/1.0)" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const pageHtml = await res.text();
        const pageLinks = extractLinks(pageHtml, formattedUrl);
        for (const pl of pageLinks) {
          if (!allLinks.has(pl.url)) {
            allLinks.set(pl.url, pl.title);
          }
        }
      }
    } catch {
      // skip failed pages
    }
  });

  await Promise.all(level2Promises);

  const links = Array.from(allLinks.entries()).map(([u, t]) => ({ url: u, title: t }));

  return new Response(
    JSON.stringify({ content, links }),
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

  // Replace block elements with newlines
  text = text.replace(/<(p|div|h[1-6]|li|br|tr)[^>]*>/gi, "\n");
  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
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
