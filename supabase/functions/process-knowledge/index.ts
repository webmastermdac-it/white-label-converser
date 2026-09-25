import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { knowledge_base_id } = await req.json();
    if (!knowledge_base_id) throw new Error("knowledge_base_id required");

    const { data: source, error: srcErr } = await supabase
      .from("knowledge_base")
      .select("*")
      .eq("id", knowledge_base_id)
      .single();
    if (srcErr || !source) throw new Error("Source not found");

    // --- Plan check: block Free plan ---
    const { data: botConfig } = await supabase
      .from("chatbot_configs")
      .select("client_id")
      .eq("id", source.chatbot_id)
      .single();

    if (botConfig) {
      const { data: client } = await supabase
        .from("clients")
        .select("plan")
        .eq("id", botConfig.client_id)
        .single();

      if (client?.plan === "free") {
        await supabase.from("knowledge_base").update({
          status: "error",
          error_message: "Upgrade required. RAG is not available on the Free plan.",
        }).eq("id", knowledge_base_id);
        return jsonResponse({ error: "Upgrade required. RAG is not available on the Free plan." }, 403);
      }
    }

    await supabase.from("knowledge_base").update({ status: "processing", error_message: null }).eq("id", knowledge_base_id);

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) {
      throw new Error("OPENAI_API_KEY not configured. Please add it in settings.");
    }

    let rawText = "";

    if (source.type === "faq" || source.type === "txt") {
      rawText = source.source_url || "";
    } else if (source.type === "url") {
      rawText = await scrapeUrl(source.source_url);
    } else if (["pdf", "docx", "doc", "csv", "xlsx", "md"].includes(source.type)) {
      rawText = await extractFileText(supabase, source.file_path, source.type);
    }

    if (!rawText.trim()) {
      await supabase.from("knowledge_base").update({ status: "error", error_message: "Nessun testo estratto dal documento" }).eq("id", knowledge_base_id);
      return jsonResponse({ error: "No text extracted" }, 400);
    }

    const chunks = chunkText(rawText, 800, 150, {
      source_name: source.name,
      source_type: source.type,
      url: source.page_url || (source.type === "url" ? source.source_url : undefined),
    });

    const embeddings = await generateEmbeddings(chunks.map(c => c.content), OPENAI_KEY);

    await supabase.from("knowledge_chunks").delete().eq("knowledge_base_id", knowledge_base_id);

    const batchSize = 50;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize).map((chunk, idx) => ({
        knowledge_base_id,
        chatbot_id: source.chatbot_id,
        content: chunk.content,
        embedding: embeddings[i + idx] ? JSON.stringify(embeddings[i + idx]) : null,
        metadata: chunk.metadata,
        chunk_index: i + idx,
        token_count: chunk.tokenCount,
      }));

      const { error: insertErr } = await supabase.from("knowledge_chunks").insert(batch);
      if (insertErr) throw new Error(`Failed to insert chunks: ${insertErr.message}`);
    }

    await supabase.from("knowledge_base").update({
      status: "ready",
      chunk_count: chunks.length,
      updated_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", knowledge_base_id);

    return jsonResponse({ success: true, chunk_count: chunks.length });
  } catch (error: any) {
    console.error("process-knowledge error:", error);
    const userMessage = "Errore nel processare il documento. Riprova o contatta il supporto.";
    try {
      const { knowledge_base_id } = await req.clone().json();
      if (knowledge_base_id) {
        await supabase.from("knowledge_base").update({
          status: "error",
          error_message: userMessage,
        }).eq("id", knowledge_base_id);
      }
    } catch { }
    return jsonResponse({ error: userMessage, detail: error.message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function scrapeUrl(url: string | null): Promise<string> {
  if (!url) return "";
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

  const response = await fetch(formattedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GeniusBot/1.0)" },
  });
  if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);

  const html = await response.text();
  let text = htmlToText(html);

  // JavaScript-rendered pages (SPA) return an empty shell: fall back to a
  // reader proxy and to structured data (meta tags, JSON-LD, noscript).
  if (isThinContent(text)) {
    const rendered = await fetchRenderedText(formattedUrl);
    const structured = extractStructuredContent(html);
    text = [rendered, structured].filter((part) => !isThinContent(part)).join("\n\n") || text;
  }

  return text.slice(0, 100000);
}

function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  text = text.replace(/<(p|div|h[1-6]|li|br|tr)[^>]*>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  return decodeEntities(text);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .split("\n").map(l => l.trim()).filter(Boolean).join("\n");
}

function isThinContent(text: string | null | undefined): boolean {
  return !text || text.replace(/\s+/g, " ").trim().length < 200;
}

async function fetchRenderedText(url: string): Promise<string> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GeniusBot/1.0)", Accept: "text/plain, text/html" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return "";
    const body = await res.text();
    const text = body.includes("<html") || body.includes("<body") ? htmlToText(body) : decodeEntities(body);
    return isThinContent(text) ? "" : text.slice(0, 100000);
  } catch (e) {
    console.error("Render proxy failed:", e);
    return "";
  }
}

function extractStructuredContent(html: string): string {
  const parts: string[] = [];

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) parts.push(decodeEntities(title));

  const metaRegex = /<meta[^>]+(?:name|property)=["'](description|og:title|og:description|twitter:title|twitter:description)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  let meta;
  while ((meta = metaRegex.exec(html)) !== null) parts.push(decodeEntities(meta[2]));

  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ld;
  while ((ld = ldRegex.exec(html)) !== null) {
    try {
      parts.push(flattenJson(JSON.parse(ld[1])));
    } catch { /* ignore malformed JSON-LD */ }
  }

  const noscriptRegex = /<noscript[^>]*>([\s\S]*?)<\/noscript>/gi;
  let ns;
  while ((ns = noscriptRegex.exec(html)) !== null) parts.push(htmlToText(ns[1]));

  return parts.filter(Boolean).join("\n");
}

function flattenJson(value: unknown, depth = 0): string {
  if (depth > 6 || value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(v => flattenJson(v, depth + 1)).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !key.startsWith("@"))
      .map(([key, v]) => {
        const nested = flattenJson(v, depth + 1);
        return nested ? `${key}: ${nested}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}


async function extractFileText(supabase: any, filePath: string | null, fileType: string): Promise<string> {
  if (!filePath) return "";
  const { data: fileData, error } = await supabase.storage.from("kb-documents").download(filePath);
  if (error || !fileData) throw new Error(`Download failed: ${error?.message}`);

  const arrayBuf = await fileData.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuf);

  if (fileType === "pdf") {
    const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
    return (await pdfParse(uint8)).text || "";
  } else if (fileType === "docx" || fileType === "doc") {
    const mammoth = await import("npm:mammoth@1.8.0");
    return (await mammoth.extractRawText({ buffer: uint8 })).value || "";
  } else if (fileType === "csv") {
    return new TextDecoder().decode(uint8);
  } else if (fileType === "xlsx") {
    const XLSX = await import("npm:xlsx@0.18.5");
    const workbook = XLSX.read(uint8, { type: "array" });
    return XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
  }
  return await fileData.text();
}

interface Chunk {
  content: string;
  metadata: Record<string, any>;
  tokenCount: number;
}

function chunkText(text: string, maxTokens: number, overlap: number, baseMeta: Record<string, any>): Chunk[] {
  const charLimit = maxTokens * 4;
  const overlapChars = overlap * 4;
  const paragraphs = text.split(/\n{2,}/);
  const chunks: Chunk[] = [];
  let currentChunk = "";
  let currentSection = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.length < 100 && (trimmed.endsWith(":") || /^[A-Z\d]/.test(trimmed))) {
      currentSection = trimmed;
    }
    if (currentChunk.length + trimmed.length + 2 > charLimit) {
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: { ...baseMeta, section: currentSection || undefined },
          tokenCount: Math.ceil(currentChunk.trim().length / 4),
        });
      }
      const overlapText = currentChunk.slice(-overlapChars);
      currentChunk = overlapText + "\n\n" + trimmed;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: { ...baseMeta, section: currentSection || undefined },
      tokenCount: Math.ceil(currentChunk.trim().length / 4),
    });
  }
  return chunks;
}

async function generateEmbeddings(texts: string[], openaiKey: string): Promise<(number[] | null)[]> {
  const batchSize = 100;
  const allEmbeddings: (number[] | null)[] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await embedBatch(batch, openaiKey);
    allEmbeddings.push(...embeddings);
  }
  return allEmbeddings;
}

async function embedBatch(texts: string[], openaiKey: string, retries = 3): Promise<(number[] | null)[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: texts,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.data.map((d: any) => d.embedding);
      }
      const errText = await response.text();
      console.error("OpenAI embedding error:", response.status, errText);
      if (response.status === 429) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw new Error(`OpenAI embedding error: ${response.status} - ${errText.slice(0, 200)}`);
    } catch (error) {
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }
  return texts.map(() => null);
}
