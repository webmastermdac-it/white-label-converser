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
      url: source.source_url || undefined,
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
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  text = text.split("\n").map(l => l.trim()).filter(Boolean).join("\n");
  return text.slice(0, 100000);
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
