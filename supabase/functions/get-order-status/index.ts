import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StatusCode =
  | "awaiting_payment" | "preparing" | "on_hold" | "shipped" | "delivered"
  | "completed" | "cancelled" | "refunded" | "failed" | "unknown";

interface OrderResult {
  found: boolean;
  status_code?: StatusCode;
  status_label?: string;
  order_date?: string | null;
  shipped?: boolean;
  delivered?: boolean;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
}

const NOT_FOUND: OrderResult = { found: false };

// ── Soft in-memory rate limit: 8 requests / 10 minutes per embed_token + IP ──
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_LIMIT) { hits.set(key, list); return true; }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
  return false;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const normEmail = (e: unknown) => String(e || "").toLowerCase().trim();

// ── WooCommerce ──
const WOO: Record<string, [StatusCode, string]> = {
  pending: ["awaiting_payment", "In attesa di pagamento"],
  processing: ["preparing", "In lavorazione"],
  "on-hold": ["on_hold", "In sospeso"],
  completed: ["completed", "Completato / Spedito"],
  cancelled: ["cancelled", "Annullato"],
  refunded: ["refunded", "Rimborsato"],
  failed: ["failed", "Pagamento fallito"],
};

async function wooOrder(storeUrl: string, cfg: any, orderNumber: string, email: string): Promise<OrderResult> {
  const headers = { Authorization: "Basic " + btoa(`${cfg.api_key}:${cfg.api_secret}`) };
  let order: any = null;
  if (/^\d+$/.test(orderNumber)) {
    const r = await fetch(`${storeUrl}/wp-json/wc/v3/orders/${orderNumber}`, { headers });
    if (r.ok) {
      const o = await r.json();
      if (String(o.number ?? o.id) === orderNumber || String(o.id) === orderNumber) order = o;
    }
  }
  if (!order) {
    const r = await fetch(`${storeUrl}/wp-json/wc/v3/orders?search=${encodeURIComponent(orderNumber)}&per_page=5`, { headers });
    if (r.ok) {
      const list = await r.json();
      if (Array.isArray(list)) order = list.find((o: any) => String(o.number) === orderNumber) || null;
    }
  }
  if (!order || normEmail(order.billing?.email) !== email) return NOT_FOUND;

  const [code, label] = WOO[order.status] || ["unknown" as StatusCode, String(order.status || "Sconosciuto")];
  let carrier: string | null = null, tracking_number: string | null = null, tracking_url: string | null = null;
  const meta = (order.meta_data || []).find((m: any) => m.key === "_wc_shipment_tracking_items");
  const item = Array.isArray(meta?.value) ? meta.value[meta.value.length - 1] : null;
  if (item) {
    carrier = item.custom_tracking_provider || item.tracking_provider || null;
    tracking_number = item.tracking_number || null;
    tracking_url = item.custom_tracking_link || item.tracking_link || null;
  }
  const shipped = code === "completed" || !!tracking_number;
  return {
    found: true, status_code: code, status_label: label, order_date: order.date_created || null,
    shipped, delivered: false, carrier, tracking_number, tracking_url,
  };
}

// ── Shopify ──
async function shopifyOrder(storeUrl: string, cfg: any, orderNumber: string, email: string): Promise<OrderResult> {
  const r = await fetch(
    `${storeUrl}/admin/api/2024-01/orders.json?name=${encodeURIComponent("#" + orderNumber)}&status=any`,
    { headers: { "X-Shopify-Access-Token": cfg.api_key } },
  );
  if (!r.ok) return NOT_FOUND;
  const data = await r.json();
  const order = (data.orders || []).find((o: any) => String(o.name || "").replace(/^#/, "") === orderNumber) || data.orders?.[0];
  if (!order || normEmail(order.email || order.contact_email) !== email) return NOT_FOUND;

  const fulfillments: any[] = order.fulfillments || [];
  const f = fulfillments.filter((x) => x.status !== "cancelled").slice(-1)[0];
  const delivered = fulfillments.some((x) => x.shipment_status === "delivered");
  const fs = order.fulfillment_status;
  const fin = order.financial_status;
  let code: StatusCode = "unknown", label = fin || "Sconosciuto";
  if (order.cancelled_at) { code = "cancelled"; label = "Annullato"; }
  else if (delivered) { code = "delivered"; label = "Consegnato"; }
  else if (fs === "fulfilled") { code = "shipped"; label = "Spedito"; }
  else if (fs === "partial") { code = "shipped"; label = "Parzialmente spedito"; }
  else if (fin === "refunded") { code = "refunded"; label = "Rimborsato"; }
  else if (fin === "pending") { code = "awaiting_payment"; label = "In attesa di pagamento"; }
  else if (fin === "paid" || fin === "partially_paid") { code = "preparing"; label = "Pagato, in preparazione"; }

  return {
    found: true, status_code: code, status_label: label, order_date: order.created_at || null,
    shipped: code === "shipped" || code === "delivered", delivered,
    carrier: f?.tracking_company || null,
    tracking_number: f?.tracking_number || f?.tracking_numbers?.[0] || null,
    tracking_url: f?.tracking_url || f?.tracking_urls?.[0] || null,
  };
}

// ── PrestaShop ──
function psName(names: any): string {
  if (Array.isArray(names)) return names[0]?.value || "";
  return typeof names === "string" ? names : "";
}
function psStatus(label: string): StatusCode {
  const l = label.toLowerCase();
  if (/consegnat|deliver/.test(l)) return "delivered";
  if (/spedit|shipped/.test(l)) return "shipped";
  if (/annullat|cancel/.test(l)) return "cancelled";
  if (/rimbors|refund/.test(l)) return "refunded";
  if (/in attesa|awaiting/.test(l)) return "awaiting_payment";
  return "unknown";
}

async function prestaOrder(storeUrl: string, cfg: any, orderNumber: string, email: string): Promise<OrderResult> {
  const headers = { Authorization: "Basic " + btoa(`${cfg.api_key}:`) };
  let order: any = null;
  if (/^\d+$/.test(orderNumber)) {
    const r = await fetch(`${storeUrl}/api/orders/${orderNumber}?output_format=JSON`, { headers });
    if (r.ok) order = (await r.json()).order || null;
  }
  if (!order) {
    const ref = orderNumber.replace(/[^A-Za-z0-9]/g, "");
    if (ref) {
      const r = await fetch(`${storeUrl}/api/orders?filter[reference]=[${encodeURIComponent(ref)}]&display=full&output_format=JSON`, { headers });
      if (r.ok) {
        const d = await r.json();
        order = Array.isArray(d.orders) ? d.orders[0] || null : null;
      }
    }
  }
  if (!order?.id_customer) return NOT_FOUND;

  const custRes = await fetch(`${storeUrl}/api/customers/${order.id_customer}?output_format=JSON`, { headers });
  if (!custRes.ok) return NOT_FOUND;
  const cust = await custRes.json();
  if (normEmail(cust.customer?.email) !== email) return NOT_FOUND;

  let label = "Stato aggiornato";
  const stateRes = await fetch(`${storeUrl}/api/order_states/${order.current_state}?output_format=JSON`, { headers });
  if (stateRes.ok) label = psName((await stateRes.json()).order_state?.name) || label;
  const code = psStatus(label);

  let carrier: string | null = null;
  let tracking_number: string | null = order.shipping_number || null;
  try {
    const ocRes = await fetch(`${storeUrl}/api/order_carriers?filter[id_order]=[${order.id}]&display=full&output_format=JSON`, { headers });
    if (ocRes.ok) {
      const oc = (await ocRes.json()).order_carriers?.[0];
      if (oc?.tracking_number && !tracking_number) tracking_number = oc.tracking_number;
      const idCarrier = oc?.id_carrier || order.id_carrier;
      if (idCarrier) {
        const cRes = await fetch(`${storeUrl}/api/carriers/${idCarrier}?output_format=JSON`, { headers });
        if (cRes.ok) carrier = (await cRes.json()).carrier?.name || null;
      }
    }
  } catch { /* carrier info is optional */ }

  return {
    found: true, status_code: code, status_label: label, order_date: order.date_add || null,
    shipped: code === "shipped" || code === "delivered" || !!tracking_number,
    delivered: code === "delivered", carrier, tracking_number, tracking_url: null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const embed_token = typeof body.embed_token === "string" ? body.embed_token.trim() : "";
    const orderNumber = String(body.order_number ?? "").trim().replace(/^#+/, "").replace(/\s+/g, "");
    const email = normEmail(body.email);
    if (!embed_token || !orderNumber || !email || orderNumber.length > 64 || email.length > 255) {
      return json({ error: "Missing embed_token, order_number or email" }, 400);
    }

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if (rateLimited(`${embed_token}|${ip}`)) return json({ error: "rate_limited" }, 429);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: botConfig } = await supabase
      .from("chatbot_configs").select("client_id").eq("embed_token", embed_token).single();
    if (!botConfig) return json({ error: "Invalid embed_token" }, 404);

    const { data: config } = await supabase
      .from("ecommerce_configs").select("*").eq("client_id", botConfig.client_id).maybeSingle();
    if (!config?.store_url) return json(NOT_FOUND);

    const storeUrl = config.store_url.replace(/\/$/, "");
    let result: OrderResult = NOT_FOUND;
    if (config.platform === "woocommerce") result = await wooOrder(storeUrl, config, orderNumber, email);
    else if (config.platform === "shopify") result = await shopifyOrder(storeUrl, config, orderNumber, email);
    else if (config.platform === "prestashop") result = await prestaOrder(storeUrl, config, orderNumber, email);

    return json(result);
  } catch (error: any) {
    console.error("[get-order-status] error:", error);
    return json({ error: error.message }, 500);
  }
});
