const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storagePath, filename } = await req.json();

    if (!storagePath || !filename) {
      return new Response(
        JSON.stringify({ error: "storagePath and filename are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("kb-documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Download failed: ${downloadError?.message || "No data"}`);
    }

    const ext = filename.split(".").pop()?.toLowerCase();
    let text = "";

    if (ext === "pdf") {
      // Use pdf-parse to extract text from PDF
      const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const pdfData = await pdfParse(buffer);
      text = pdfData.text || "";
    } else if (ext === "docx") {
      // Use mammoth to extract text from DOCX
      const mammoth = await import("npm:mammoth@1.8.0");
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else {
      // Try plain text
      text = await fileData.text();
    }

    // Truncate to 50k chars to avoid oversized prompts
    if (text.length > 50000) {
      text = text.slice(0, 50000) + "\n\n[...contenuto troncato...]";
    }

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing document:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
