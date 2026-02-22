import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripHtml(html: string): string {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

async function verifyWebhook(req: Request, config: any, body: string): Promise<boolean> {
  const platform = config.platform;
  
  if (platform === "woocommerce") {
    const signature = req.headers.get("x-wc-webhook-signature");
    if (!signature || !config.webhook_secret) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(config.webhook_secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return signature === expected;
  }
  
  if (platform === "shopify") {
    const signature = req.headers.get("x-shopify-hmac-sha256");
    if (!signature || !config.webhook_secret) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(config.webhook_secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return signature === expected;
  }
  
  // Custom: simple secret match
  const secret = req.headers.get("x-webhook-secret");
  return secret === config.webhook_secret;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("client");
    if (!clientId) throw new Error("Missing client parameter");
    
    const body = await req.text();
    
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    
    const { data: config } = await supabase
      .from("ecommerce_configs")
      .select("*")
      .eq("client_id", clientId)
      .single();
    
    if (!config) throw new Error("No ecommerce config found");
    
    const verified = await verifyWebhook(req, config, body);
    if (!verified) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const data = JSON.parse(body);
    const topic = req.headers.get("x-wc-webhook-topic") || 
                  req.headers.get("x-shopify-topic") ||
                  data.event || data.action || "product.updated";
    
    if (topic.includes("deleted") || topic.includes("delete")) {
      const extId = String(data.id || data.product?.id || "");
      if (extId) {
        await supabase.from("products")
          .update({ is_active: false })
          .eq("client_id", clientId)
          .eq("external_id", extId);
      }
    } else {
      // product.created or product.updated — map and upsert
      const p = data.product || data;
      const record = {
        client_id: clientId,
        external_id: String(p.id),
        name: p.name || p.title || "",
        description: stripHtml(p.description || p.body_html || ""),
        price: parseFloat(p.price || p.variants?.[0]?.price || "0"),
        sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
        in_stock: p.stock_status ? p.stock_status === "instock" : (p.variants?.[0]?.inventory_quantity > 0 ?? true),
        stock_quantity: p.stock_quantity ?? p.variants?.[0]?.inventory_quantity ?? null,
        categories: p.categories?.map((c: any) => c.name || c) || [],
        tags: p.tags?.map?.((t: any) => t.name || t) || [],
        variants: (p.variations || p.variants || []).slice(0, 50),
        image_url: p.images?.[0]?.src || null,
        product_url: p.permalink || null,
        raw_data: p,
        last_updated: new Date().toISOString(),
        is_active: true,
      };
      
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("client_id", clientId)
        .eq("external_id", record.external_id)
        .single();
      
      if (existing) {
        await supabase.from("products").update(record).eq("id", existing.id);
      } else {
        await supabase.from("products").insert(record);
      }
    }
    
    // Rebuild product knowledge
    const { data: allProducts } = await supabase
      .from("products")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("name");
    
    // Simple knowledge builder inline
    const now = new Date().toISOString();
    let text = `## CATALOGO PRODOTTI (aggiornato: ${new Date().toLocaleDateString("it-IT")})\n\n`;
    text += `Hai ${allProducts?.length || 0} prodotti disponibili.\n\n`;
    for (const prod of (allProducts || []).slice(0, 200)) {
      text += `**${prod.name}** - €${prod.price}${prod.in_stock ? " ✅" : " ❌ Esaurito"}\n`;
    }
    
    const { data: botConfig } = await supabase
      .from("chatbot_configs")
      .select("id")
      .eq("client_id", clientId)
      .single();
    
    if (botConfig) {
      await supabase.from("chatbot_configs").update({ knowledge_base_products: text }).eq("id", botConfig.id);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error: any) {
    console.error("webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
