import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeWooStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "In attesa di pagamento",
    processing: "In lavorazione",
    "on-hold": "In sospeso",
    completed: "Completato / Spedito",
    cancelled: "Annullato",
    refunded: "Rimborsato",
    failed: "Pagamento fallito",
  };
  return map[status] || status;
}

function normalizeShopifyStatus(order: any): string {
  const fulfillment = order.fulfillment_status;
  const financial = order.financial_status;
  if (fulfillment === "fulfilled") return "Spedito";
  if (fulfillment === "partial") return "Parzialmente spedito";
  if (financial === "refunded") return "Rimborsato";
  if (financial === "pending") return "In attesa di pagamento";
  if (financial === "paid" && !fulfillment) return "Pagato, in preparazione";
  return financial || "Sconosciuto";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { embed_token, order_number, email } = await req.json();
    if (!embed_token || !order_number || !email) {
      return new Response(JSON.stringify({ error: "Missing embed_token, order_number or email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: botConfig } = await supabase
      .from("chatbot_configs")
      .select("client_id")
      .eq("embed_token", embed_token)
      .single();

    if (!botConfig) {
      return new Response(JSON.stringify({ error: "Invalid embed_token" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await supabase
      .from("ecommerce_configs")
      .select("*")
      .eq("client_id", botConfig.client_id)
      .single();

    if (!config) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeUrl = config.store_url.replace(/\/$/, "");
    const emailLower = String(email).toLowerCase().trim();
    let result: { found: boolean; status?: string; order_date?: string } = { found: false };

    if (config.platform === "woocommerce") {
      const res = await fetch(`${storeUrl}/wp-json/wc/v3/orders/${encodeURIComponent(order_number)}`, {
        headers: { Authorization: "Basic " + btoa(`${config.api_key}:${config.api_secret}`) },
      });
      if (res.ok) {
        const order = await res.json();
        if ((order.billing?.email || "").toLowerCase().trim() === emailLower) {
          result = { found: true, status: normalizeWooStatus(order.status), order_date: order.date_created };
        }
      }
    } else if (config.platform === "shopify") {
      const res = await fetch(
        `${storeUrl}/admin/api/2024-01/orders.json?name=${encodeURIComponent("#" + order_number)}&status=any`,
        { headers: { "X-Shopify-Access-Token": config.api_key } },
      );
      if (res.ok) {
        const data = await res.json();
        const order = data.orders?.[0];
        if (order && (order.email || order.contact_email || "").toLowerCase().trim() === emailLower) {
          result = { found: true, status: normalizeShopifyStatus(order), order_date: order.created_at };
        }
      }
    } else if (config.platform === "prestashop") {
      const authHeader = "Basic " + btoa(`${config.api_key}:`);
      const orderRes = await fetch(`${storeUrl}/api/orders/${encodeURIComponent(order_number)}?output_format=JSON`, {
        headers: { Authorization: authHeader },
      });
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        const order = orderData.order;
        if (order?.id_customer) {
          const custRes = await fetch(`${storeUrl}/api/customers/${order.id_customer}?output_format=JSON`, {
            headers: { Authorization: authHeader },
          });
          if (custRes.ok) {
            const custData = await custRes.json();
            const customerEmail = (custData.customer?.email || "").toLowerCase().trim();
            if (customerEmail === emailLower) {
              const stateRes = await fetch(
                `${storeUrl}/api/order_states/${order.current_state}?output_format=JSON`,
                { headers: { Authorization: authHeader } },
              );
              let stateName = "Stato aggiornato";
              if (stateRes.ok) {
                const stateData = await stateRes.json();
                const names = stateData.order_state?.name;
                stateName = Array.isArray(names) ? (names[0]?.value || stateName) : (names || stateName);
              }
              result = { found: true, status: stateName, order_date: order.date_add };
            }
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[get-order-status] error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
