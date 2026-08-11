import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const normalizeStoreUrl = (u: string) => (u || "").trim().replace(/\/+$/, "");
const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type Buyer = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

function splitName(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || "Cliente";
  const last = parts.slice(1).join(" ") || "Chat";
  return { first, last };
}

// ──────────────────────────────── WOOCOMMERCE ────────────────────────────────
async function woocommerceCheckout(config: any, product_id: string, qty: number, buyer: Buyer) {
  const store = normalizeStoreUrl(config.store_url);
  if (!config.api_key || !config.api_secret) {
    return { success: false, error: "Credenziali WooCommerce (consumer key/secret) mancanti." };
  }
  const auth = btoa(`${config.api_key}:${config.api_secret}`);
  const { first, last } = splitName(buyer.name);

  const res = await fetch(`${store}/wp-json/wc/v3/orders`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "pending",
      line_items: [{ product_id: Number(product_id) || product_id, quantity: qty }],
      billing: {
        first_name: first,
        last_name: last,
        email: buyer.email || "",
        phone: buyer.phone || "",
        address_1: buyer.address || "",
      },
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        error:
          "Le chiavi API WooCommerce salvate non hanno permessi di scrittura (Read/Write). Rigenerale in WooCommerce → Impostazioni → Avanzate → API REST con permessi Read/Write e salvale nell'integrazione.",
      };
    }
    return { success: false, error: `WooCommerce ${res.status}: ${body.slice(0, 400)}` };
  }

  let order: any = {};
  try {
    order = JSON.parse(body);
  } catch {
    return { success: false, error: "Risposta WooCommerce non valida." };
  }

  const checkout_url =
    order.payment_url ||
    (order.id && order.order_key
      ? `${store}/checkout/order-pay/${order.id}/?pay_for_order=true&key=${order.order_key}`
      : null);

  if (!checkout_url) return { success: false, error: "Ordine creato ma link di pagamento non disponibile." };
  return { success: true, checkout_url, order_reference: order.number || String(order.id) };
}

// ──────────────────────────────── PRESTASHOP ────────────────────────────────
async function prestashopRequest(config: any, path: string, method: string, xml?: string) {
  const store = normalizeStoreUrl(config.store_url);
  if (!config.api_key) throw new Error("PrestaShop API key mancante");
  const url = new URL(`${store}/api${path}`);
  url.searchParams.set("output_format", "JSON");
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${config.api_key}:`)}`,
      ...(xml ? { "Content-Type": "text/xml" } : {}),
    },
    body: xml,
  });
  const text = await res.text();
  if (!res.ok) {
    const err: any = new Error(`PrestaShop ${res.status}: ${text.slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function prestashopCheckout(config: any, product_id: string, qty: number, buyer: Buyer) {
  const store = normalizeStoreUrl(config.store_url);
  const { first, last } = splitName(buyer.name);

  try {
    // 1. Customer
    let id_customer: string | null = null;
    try {
      const customerXml = `<?xml version="1.0" encoding="UTF-8"?><prestashop><customer><firstname>${esc(
        first,
      )}</firstname><lastname>${esc(last)}</lastname><email>${esc(
        buyer.email || `chat-${Date.now()}@example.com`,
      )}</email><passwd>${esc(crypto.randomUUID().slice(0, 12))}</passwd><active>1</active></customer></prestashop>`;
      const created = await prestashopRequest(config, "/customers", "POST", customerXml);
      id_customer = String(created?.customer?.id ?? created?.id ?? "") || null;
    } catch (e) {
      console.warn("[create-real-checkout] prestashop customer:", (e as Error).message);
    }

    // 2. Address (best effort, needs country id 10 = Italia by default in most shops)
    let id_address: string | null = null;
    if (id_customer && buyer.address) {
      try {
        const addressXml = `<?xml version="1.0" encoding="UTF-8"?><prestashop><address><id_customer>${id_customer}</id_customer><id_country>10</id_country><alias>Chat</alias><firstname>${esc(
          first,
        )}</firstname><lastname>${esc(last)}</lastname><address1>${esc(buyer.address)}</address1><city>${esc(
          "n/d",
        )}</city><phone>${esc(buyer.phone || "")}</phone></address></prestashop>`;
        const createdAddr = await prestashopRequest(config, "/addresses", "POST", addressXml);
        id_address = String(createdAddr?.address?.id ?? createdAddr?.id ?? "") || null;
      } catch (e) {
        console.warn("[create-real-checkout] prestashop address:", (e as Error).message);
      }
    }

    // 3. Cart
    const cartXml = `<?xml version="1.0" encoding="UTF-8"?><prestashop><cart>${
      id_customer ? `<id_customer>${id_customer}</id_customer>` : ""
    }${id_address ? `<id_address_delivery>${id_address}</id_address_delivery><id_address_invoice>${id_address}</id_address_invoice>` : ""}<id_currency>1</id_currency><id_lang>1</id_lang><associations><cart_rows><cart_row><id_product>${esc(
      product_id,
    )}</id_product><id_product_attribute>0</id_product_attribute><quantity>${qty}</quantity></cart_row></cart_rows></associations></cart></prestashop>`;

    const cart = await prestashopRequest(config, "/carts", "POST", cartXml);
    const id_cart = String(cart?.cart?.id ?? cart?.id ?? "");
    if (!id_cart) return { success: false, error: "Carrello PrestaShop non creato." };

    return {
      success: true,
      checkout_url: `${store}/index.php?controller=order&id_cart=${id_cart}`,
      order_reference: `cart ${id_cart}`,
    };
  } catch (e: any) {
    if (e.status === 401 || e.status === 403) {
      return {
        success: false,
        error:
          "La chiave webservice PrestaShop non ha permessi di scrittura. Abilita Add/Modify su carts, customers e addresses da Parametri Avanzati → Servizi Web.",
      };
    }
    return { success: false, error: e.message };
  }
}

// ──────────────────────────────── SHOPIFY ────────────────────────────────
async function shopifyCheckout(config: any, product_id: string, qty: number, buyer: Buyer) {
  const store = normalizeStoreUrl(config.store_url);
  const token = config.storefront_access_token;
  if (!token) {
    return {
      success: false,
      error:
        "Manca lo Storefront access token Shopify. Generalo da Shopify Admin → App → Sviluppa app → API Storefront e salvalo nell'integrazione.",
    };
  }

  // Storefront API needs a variant GID; products table stores variants from the Admin sync.
  const variantGid = product_id.startsWith("gid://")
    ? product_id
    : `gid://shopify/ProductVariant/${product_id}`;

  const res = await fetch(`${store}/api/2024-07/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Storefront-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `mutation cartCreate($lines: [CartLineInput!]!, $email: String) {
        cartCreate(input: { lines: $lines, buyerIdentity: { email: $email } }) {
          cart { id checkoutUrl }
          userErrors { field message }
        }
      }`,
      variables: { lines: [{ merchandiseId: variantGid, quantity: qty }], email: buyer.email || null },
    }),
  });

  const text = await res.text();
  if (!res.ok) return { success: false, error: `Shopify Storefront ${res.status}: ${text.slice(0, 400)}` };

  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    return { success: false, error: "Risposta Shopify non valida." };
  }
  const errs = data?.data?.cartCreate?.userErrors;
  if (errs?.length) return { success: false, error: errs.map((e: any) => e.message).join("; ") };
  const url = data?.data?.cartCreate?.cart?.checkoutUrl;
  if (!url) return { success: false, error: "Checkout Shopify non disponibile." };
  return { success: true, checkout_url: url };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { embed_token, product_id, quantity, name, email, phone, address } = body;
    const qty = Math.max(1, Number(quantity) || 1);

    if (!embed_token || !product_id) return json({ success: false, error: "Parametri mancanti." }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: bot } = await supabase
      .from("chatbot_configs")
      .select("id, client_id, business_vertical")
      .eq("embed_token", embed_token)
      .maybeSingle();

    if (!bot) return json({ success: false, error: "Embed token non valido." }, 401);
    if (bot.business_vertical !== "ecommerce") {
      return json({ success: false, error: "Acquisti non disponibili per questo chatbot." }, 403);
    }

    const { data: config } = await supabase
      .from("ecommerce_configs")
      .select("platform, store_url, api_key, api_secret, storefront_access_token")
      .eq("client_id", bot.client_id)
      .maybeSingle();

    if (!config) return json({ success: false, error: "Nessuna integrazione ecommerce configurata." }, 400);

    // Resolve the stored product so we use real store identifiers
    const { data: product } = await supabase
      .from("products")
      .select("external_id, name, variants, in_stock")
      .eq("client_id", bot.client_id)
      .eq("external_id", String(product_id))
      .maybeSingle();

    const buyer: Buyer = { name, email, phone, address };
    let storeProductId = String(product?.external_id || product_id);

    let result: any;
    switch (config.platform) {
      case "woocommerce":
        result = await woocommerceCheckout(config, storeProductId, qty, buyer);
        break;
      case "prestashop":
        result = await prestashopCheckout(config, storeProductId, qty, buyer);
        break;
      case "shopify": {
        const variantId = (product?.variants as any[])?.[0]?.id;
        result = await shopifyCheckout(config, String(variantId || storeProductId), qty, buyer);
        break;
      }
      default:
        result = {
          success: false,
          error: "La creazione di un acquisto reale non è supportata per questa piattaforma.",
        };
    }

    return json({ ...result, product_name: product?.name || null });
  } catch (error: any) {
    console.error("create-real-checkout error:", error);
    return json({ success: false, error: error.message }, 500);
  }
});
