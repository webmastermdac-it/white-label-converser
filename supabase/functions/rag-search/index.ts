import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, chatbot_id, match_count = 5, match_threshold = 0.5 } = await req.json();
    if (!query || !chatbot_id) throw new Error("query and chatbot_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { count } = await supabase
      .from("knowledge_chunks")
      .select("id", { count: "exact", head: true })
      .eq("chatbot_id", chatbot_id);

    if (!count || count === 0) {
      return jsonResp({ chunks: [], has_rag: false });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) {
      console.error("OPENAI_API_KEY not configured for embeddings");
      return jsonResp({ chunks: [], has_rag: true, error: "Embedding API not configured" });
    }

    const embedding = await generateQueryEmbedding(query, OPENAI_KEY);
    if (!embedding) {
      return jsonResp({ chunks: [], has_rag: true, error: "Embedding generation failed" });
    }

    const embeddingStr = `[${embedding.join(",")}]`;
    const { data: chunks, error } = await supabase.rpc("match_chunks", {
      _chatbot_id: chatbot_id,
      _query_embedding: embeddingStr,
      _match_count: match_count,
      _match_threshold: match_threshold,
    });

    if (error) throw new Error(`Search failed: ${error.message}`);

    return jsonResp({ chunks: chunks || [], has_rag: true });
  } catch (error: any) {
    console.error("rag-search error:", error);
    return jsonResp({ error: error.message }, 500);
  }
});

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function generateQueryEmbedding(text: string, openaiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.data[0].embedding;
    }
    const errText = await res.text();
    console.error("OpenAI embedding error:", res.status, errText);
    return null;
  } catch (e) {
    console.error("OpenAI embedding error:", e);
    return null;
  }
}
