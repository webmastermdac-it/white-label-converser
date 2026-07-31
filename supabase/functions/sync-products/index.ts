import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const SyncBodySchema = z.object({
  client_id: z.string().uuid(),
});

const PRESTASHOP_PAGE_SIZE = 100;

function stripHtml(html: string): string {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "number"
    ? value
    : parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatPrice(value: unknown): string {
  return toNumber(value, 0).toFixed(2);
}

function normalizeStoreUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getLocalizedText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const languages = asArray(value.language);
  const firstLanguage = languages[0] as any;
  if (typeof firstLanguage === "string") return firstLanguage;
  return firstLanguage?.value || firstLanguage?.['#text'] || "";
}

function isTruthyFlag(value: unknown): boolean {
  return ["1", "true", "yes"].includes(String(value ?? "").toLowerCase());
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPrestaShopJson(config: any, path: string, params: Record<string, string> = {}) {
  const apiKey = config.api_key;
  if (!apiKey) throw new Error("PrestaShop API key missing");

  const url = new URL(`${normalizeStoreUrl(config.store_url)}/api${path}`);
  url.searchParams.set("output_format", "JSON");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetchWithTimeout(url.toString(), {
    headers: { Authorization: `Basic ${btoa(`${apiKey}:`)}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PrestaShop API error ${res.status}: ${body || res.statusText}`);
  }
  return await res.json();
}

async function fetchPrestaShopConfigurations(config: any) {
  const defaults = { stockManaged: null as boolean | null, orderOutOfStock: null as boolean | null };
  const names = ["PS_STOCK_MANAGEMENT", "PS_ORDER_OUT_OF_STOCK"];

  for (const name of names) {
    try {
      const data = await fetchPrestaShopJson(config, "/configurations", {
        "filter[name]": `[${name}]`,
        display: "[name,value]",
      });
      const row = asArray<any>(data.configurations)[0];
      const value = row?.value;
      if (name === "PS_STOCK_MANAGEMENT") defaults.stockManaged = isTruthyFlag(value);
      if (name === "PS_ORDER_OUT_OF_STOCK") defaults.orderOutOfStock = isTruthyFlag(value);
    } catch (error) {
      console.warn(`PrestaShop configuration ${name} unavailable:`, error);
    }
  }

  return defaults;
}

async function fetchPrestaShopStock(config: any) {
  const stockByProduct = new Map<string, any[]>();
  let offset = 0;

  while (true) {
    const data = await fetchPrestaShopJson(config, "/stock_availables", {
      display: "[id_product,id_product_attribute,quantity,out_of_stock,depends_on_stock]",
      limit: `${offset},${PRESTASHOP_PAGE_SIZE}`,
    });

    const rows = asArray<any>(data.stock_availables);
    if (!rows.length) break;

    for (const row of rows) {
      const productId = String(row.id_product ?? "");
      if (!productId) continue;
      const current = stockByProduct.get(productId) || [];
      current.push(row);
      stockByProduct.set(productId, current);
    }

    if (rows.length < PRESTASHOP_PAGE_SIZE) break;
    offset += PRESTASHOP_PAGE_SIZE;
    if (offset > 10000) break;
  }

  return stockByProduct;
}

async function fetchPrestaShopCategories(config: any) {
  const names = new Map<string, string>();
  let offset = 0;

  try {
    while (true) {
      const data = await fetchPrestaShopJson(config, "/categories", {
        display: "[id,name]",
        limit: `${offset},${PRESTASHOP_PAGE_SIZE}`,
      });
      const rows = asArray<any>(data.categories);
      if (!rows.length) break;
      for (const row of rows) {
        const label = getLocalizedText(row.name);
        if (row.id != null && label) names.set(String(row.id), label);
      }
      if (rows.length < PRESTASHOP_PAGE_SIZE) break;
      offset += PRESTASHOP_PAGE_SIZE;
      if (offset > 5000) break;
    }
  } catch (error) {
    console.warn("PrestaShop categories unavailable:", error);
  }

  return names;
}

function resolvePrestaShopCategories(product: any, categoryNames: Map<string, string>): string[] {
  const ids: string[] = [];
  const defaultId = product.id_category_default != null ? String(product.id_category_default) : "";
  if (defaultId) ids.push(defaultId);
  for (const assoc of asArray<any>(product.associations?.categories)) {
    const id = String(assoc?.id ?? "");
    if (id && !ids.includes(id)) ids.push(id);
  }
  const labels = ids
    .map(id => categoryNames.get(id))
    .filter((label): label is string => Boolean(label) && !["Root", "Home", "Casa"].includes(label as string));
  return [...new Set(labels)].slice(0, 5);
}

function isPrestaShopOnline(product: any) {
  const active = String(product.active ?? "1");
  if (active === "0" || active.toLowerCase() === "false") return false;
  // `visibility` can be none/catalog/search/both; "none" means hidden from the store front
  const visibility = String(product.visibility ?? "both").toLowerCase();
  if (visibility === "none") return false;
  return true;
}

function resolvePrestaShopStock(product: any, stockRows: any[], configValues: { stockManaged: boolean | null; orderOutOfStock: boolean | null }) {
  // Offline / hidden products must never be presented as available.
  if (!isPrestaShopOnline(product)) {
    return { inStock: false, stockQuantity: 0 };
  }

  const availableForOrder = String(product.available_for_order ?? "1") !== "0";

  if (!availableForOrder) {
    return { inStock: false, stockQuantity: 0 };
  }


  const quantities = stockRows
    .map(row => row.quantity)
    .filter(value => value !== null && value !== undefined && value !== "")
    .map(value => parseInt(String(value), 10))
    .filter(value => Number.isFinite(value));
  const stockQuantity = quantities.length ? quantities.reduce((sum, value) => sum + value, 0) : null;
  const rowAllowsOutOfStock = stockRows.some(row => String(row.out_of_stock ?? "") === "1");
  const rowUsesShopDefault = stockRows.some(row => String(row.out_of_stock ?? "") === "2");

  // If PrestaShop stock management is disabled, quantity is not meaningful: orderable products are available.
  if (configValues.stockManaged === false) {
    return { inStock: true, stockQuantity };
  }

  if (stockQuantity !== null && stockQuantity > 0) {
    return { inStock: true, stockQuantity };
  }

  if (rowAllowsOutOfStock) {
    return { inStock: true, stockQuantity };
  }

  // `out_of_stock = 2` means “use shop default”; when the default is unavailable from the API,
  // prefer not to mark orderable PrestaShop products as exhausted just because quantity is 0.
  if (rowUsesShopDefault && configValues.orderOutOfStock !== false) {
    return { inStock: true, stockQuantity };
  }

  if (!stockRows.length) {
    return { inStock: true, stockQuantity: null };
  }

  return { inStock: false, stockQuantity };
}

async function fetchWooCommerce(config: any, supabase: any) {
  const products: any[] = [];
  let page = 1;
  const auth = btoa(`${config.api_key}:${config.api_secret}`);
  
  while (true) {
    const url = `${config.store_url}/wp-json/wc/v3/products?per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
    const data = await res.json();
    if (!data.length) break;
    
    for (const p of data) {
      let variants: any[] = [];
      if (p.type === "variable" && p.variations?.length) {
        try {
          const vUrl = `${config.store_url}/wp-json/wc/v3/products/${p.id}/variations?per_page=100`;
          const vRes = await fetch(vUrl, { headers: { Authorization: `Basic ${auth}` } });
          if (vRes.ok) {
            const vData = await vRes.json();
            variants = vData.map((v: any) => ({
              name: v.attributes?.map((a: any) => a.option).join(", ") || "",
              value: v.attributes?.map((a: any) => `${a.name}: ${a.option}`).join(", ") || "",
              price: parseFloat(v.price || "0"),
              stock: v.stock_quantity ?? (v.stock_status === "instock" ? -1 : 0),
            }));
          }
        } catch (_) {}
      }
      
      products.push({
        external_id: String(p.id),
        name: p.name || "",
        description: stripHtml(p.description || p.short_description || ""),
        price: parseFloat(p.price || "0"),
        sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
        in_stock: p.stock_status === "instock",
        stock_quantity: p.stock_quantity,
        categories: (p.categories || []).map((c: any) => c.name),
        tags: (p.tags || []).map((t: any) => t.name),
        variants,
        image_url: p.images?.[0]?.src || null,
        product_url: p.permalink || null,
        raw_data: p,
      });
    }
    page++;
    if (page > 50) break; // safety
  }
  return products;
}

async function fetchShopify(config: any) {
  const products: any[] = [];
  let url = `${config.store_url.replace(/\/$/, "")}/admin/api/2024-01/products.json?limit=250`;
  
  while (url) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": config.api_key, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
    const data = await res.json();
    
    for (const p of (data.products || [])) {
      const variants = (p.variants || []).map((v: any) => ({
        name: [v.option1, v.option2, v.option3].filter(Boolean).join(" / "),
        value: v.title || "",
        price: parseFloat(v.price || "0"),
        stock: v.inventory_quantity ?? -1,
      }));
      
      products.push({
        external_id: String(p.id),
        name: p.title || "",
        description: stripHtml(p.body_html || ""),
        price: parseFloat(p.variants?.[0]?.price || "0"),
        sale_price: p.variants?.[0]?.compare_at_price ? parseFloat(p.variants[0].compare_at_price) : null,
        in_stock: p.variants?.some((v: any) => v.inventory_quantity > 0 || v.inventory_policy === "continue") ?? true,
        stock_quantity: p.variants?.reduce((s: number, v: any) => s + (v.inventory_quantity || 0), 0),
        categories: p.product_type ? [p.product_type] : [],
        tags: p.tags ? p.tags.split(", ") : [],
        variants,
        image_url: p.images?.[0]?.src || null,
        product_url: null,
        raw_data: p,
      });
    }
    
    // Pagination via Link header
    const linkHeader = res.headers.get("Link");
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : "";
  }
  return products;
}

async function fetchPrestaShop(config: any) {
  const products: any[] = [];
  const stockByProduct = await fetchPrestaShopStock(config);
  const configValues = await fetchPrestaShopConfigurations(config);
  const categoryNames = await fetchPrestaShopCategories(config);
  let offset = 0;
  
  while (true) {
    const data = await fetchPrestaShopJson(config, "/products", {
      display: "full",
      limit: `${offset},${PRESTASHOP_PAGE_SIZE}`,
    });
    const pageProducts = asArray<any>(data.products);
    if (!pageProducts.length) break;

    for (const p of pageProducts) {
      const stock = resolvePrestaShopStock(p, stockByProduct.get(String(p.id)) || [], configValues);
      const longDesc = stripHtml(getLocalizedText(p.description));
      const shortDesc = stripHtml(getLocalizedText(p.description_short));
      const description = [shortDesc, longDesc].filter(Boolean).join(" — ").slice(0, 4000);

      products.push({
        external_id: String(p.id),
        name: getLocalizedText(p.name),
        description,
        price: toNumber(p.price, 0),
        sale_price: null,
        in_stock: stock.inStock,
        stock_quantity: stock.stockQuantity,
        categories: resolvePrestaShopCategories(p, categoryNames),
        tags: [getLocalizedText(p.reference) || "", getLocalizedText(p.ean13) || ""].filter(Boolean),
        variants: [],
        image_url: null,
        product_url: getLocalizedText(p.link_rewrite)
          ? `${normalizeStoreUrl(config.store_url)}/${p.id}-${getLocalizedText(p.link_rewrite)}.html`
          : null,
        raw_data: { ...p, stock_availables: stockByProduct.get(String(p.id)) || [] },
      });
    }


    if (pageProducts.length < PRESTASHOP_PAGE_SIZE) break;
    offset += PRESTASHOP_PAGE_SIZE;
    if (offset > 10000) break;
  }

  return products;
}

async function fetchCustomAPI(config: any) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.api_key) headers["Authorization"] = `Bearer ${config.api_key}`;
  
  const res = await fetch(config.store_url, { headers });
  if (!res.ok) throw new Error(`Custom API error: ${res.status}`);
  const data = await res.json();
  const items = data.products || data.items || (Array.isArray(data) ? data : []);
  
  return items.map((p: any) => ({
    external_id: String(p.id || p.external_id || p.sku || Math.random()),
    name: p.name || p.title || "",
    description: stripHtml(p.description || ""),
    price: parseFloat(p.price || "0"),
    sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
    in_stock: p.in_stock ?? (p.stock_quantity ? p.stock_quantity > 0 : true),
    stock_quantity: p.stock_quantity ?? null,
    categories: p.categories || [],
    tags: p.tags || [],
    variants: p.variants || [],
    image_url: p.image_url || p.image || null,
    product_url: p.product_url || p.url || null,
    raw_data: p,
  }));
}

async function fetchXMLFeed(config: any) {
  const res = await fetch(config.feed_url);
  if (!res.ok) throw new Error(`Feed fetch error: ${res.status}`);
  const text = await res.text();
  const products: any[] = [];
  
  // Simple XML parsing for Google Shopping feed format
  const itemRegex = /<(?:item|entry|product)[^>]*>([\s\S]*?)<\/(?:item|entry|product)>/gi;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const item = match[1];
    const getTag = (tag: string) => {
      const m = item.match(new RegExp(`<(?:g:)?${tag}[^>]*>([\\s\\S]*?)</(?:g:)?${tag}>`, "i"));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
    };
    
    const priceStr = getTag("price") || getTag("sale_price") || "0";
    const price = parseFloat(priceStr.replace(/[^\d.,]/g, "").replace(",", "."));
    
    products.push({
      external_id: getTag("id") || getTag("sku") || String(products.length),
      name: getTag("title") || getTag("name") || "",
      description: stripHtml(getTag("description") || ""),
      price: isNaN(price) ? 0 : price,
      sale_price: null,
      in_stock: !getTag("availability")?.toLowerCase().includes("out"),
      stock_quantity: null,
      categories: getTag("product_type") ? [getTag("product_type")] : (getTag("category") ? [getTag("category")] : []),
      tags: [],
      variants: [],
      image_url: getTag("image_link") || getTag("image") || null,
      product_url: getTag("link") || getTag("url") || null,
      raw_data: {},
    });
  }
  return products;
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === sep && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

async function fetchCSVFeed(config: any) {
  const res = await fetch(config.feed_url);
  if (!res.ok) throw new Error(`CSV feed error: ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = parseCSVLine(lines[0], sep).map(h => h.toLowerCase().trim());
  
  const colMap: Record<string, string[]> = {
    name: ["name", "nome", "title", "titolo", "product_name"],
    description: ["description", "descrizione"],
    price: ["price", "prezzo", "cost"],
    in_stock: ["stock", "disponibile", "available", "in_stock", "availability"],
    categories: ["category", "categoria", "categories"],
    image_url: ["image", "immagine", "image_url", "image_link"],
    product_url: ["url", "link", "product_url"],
    external_id: ["id", "sku", "code", "codice"],
  };
  
  const findCol = (field: string): number => {
    const aliases = colMap[field] || [field];
    return headers.findIndex(h => aliases.some(a => h.includes(a)));
  };
  
  const products: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep);
    if (cols.length < 2) continue;
    
    const get = (field: string) => {
      const idx = findCol(field);
      return idx >= 0 ? cols[idx] || "" : "";
    };
    
    const priceVal = parseFloat(get("price").replace(",", ".").replace(/[^\d.]/g, ""));
    const stockVal = get("in_stock").toLowerCase();
    
    products.push({
      external_id: get("external_id") || String(i),
      name: get("name"),
      description: get("description"),
      price: isNaN(priceVal) ? 0 : priceVal,
      sale_price: null,
      in_stock: !["0", "no", "false", "esaurito", "out", "outofstock", "out of stock"].includes(stockVal),
      stock_quantity: null,
      categories: get("categories") ? get("categories").split(/[|>]/).map((c: string) => c.trim()) : [],
      tags: [],
      variants: [],
      image_url: get("image_url") || null,
      product_url: get("product_url") || null,
      raw_data: {},
    });
  }
  return products;
}

function buildProductKnowledge(products: any[], lastSyncAt: string): string {
  const active = products.filter(p => p.is_active);
  const inStock = active.filter(p => p.in_stock);
  const outOfStock = active.filter(p => !p.in_stock);
  
  let text = `## CATALOGO PRODOTTI (aggiornato: ${new Date(lastSyncAt).toLocaleDateString("it-IT")})\n\n`;
  text += `Hai ${active.length} prodotti disponibili.\n\n`;
  text += `Quando un utente chiede di un prodotto, cerca nel catalogo qui sotto e rispondi con precisione su prezzi, disponibilità e varianti.\n`;
  text += `Se un prodotto non è disponibile, dillo chiaramente e suggerisci alternative simili.\n\n`;
  
  // Group by category
  const byCategory: Record<string, any[]> = {};
  const ordered = [...inStock, ...outOfStock]; // in-stock first
  
  for (const p of ordered) {
    const cat = p.categories?.[0] || "Altro";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  }
  
  let tokenEstimate = text.length / 4;
  const MAX_TOKENS = 8000;
  let truncated = false;
  
  for (const [cat, prods] of Object.entries(byCategory)) {
    let section = `### ${cat}\n\n`;
    for (const p of prods) {
      if (tokenEstimate > MAX_TOKENS) { truncated = true; break; }
      
      const desc = p.description?.substring(0, 320) || "";
      let entry = `**${p.name}**\n`;
      if (p.categories?.length) entry += `- Categoria: ${p.categories.join(" > ")}\n`;
      entry += `- Prezzo: €${formatPrice(p.price)}`;
      if (p.sale_price) entry += ` ~~€${formatPrice(p.sale_price)}~~ SCONTATO`;
      entry += "\n";
      entry += `- Disponibilità: ${p.in_stock ? `In stock${p.stock_quantity != null && p.stock_quantity >= 0 ? ` (Qtà: ${p.stock_quantity})` : ""}` : "Esaurito"}\n`;
      if (desc) entry += `- Descrizione: ${desc}\n`;

      
      if (p.variants?.length && !(truncated && !p.in_stock)) {
        const variantStrs = p.variants.slice(0, 10).map((v: any) =>
          `${v.name || v.value}: €${formatPrice(v.price)} (${(v.stock ?? -1) > 0 || v.stock === -1 ? "disponibile" : "esaurito"})`
        );
        entry += `- Varianti: ${variantStrs.join(", ")}\n`;
      }
      if (p.product_url) entry += `- Link: ${p.product_url}\n`;
      entry += "\n";
      
      section += entry;
      tokenEstimate += entry.length / 4;
    }
    if (truncated) break;
    text += section;
  }
  
  if (truncated) {
    text += "\n\n_Catalogo troncato per lunghezza. Mostra solo prodotti disponibili._\n";
  }
  
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let supabase: any = null;
  let currentConfigId: string | null = null;
  let currentSyncLogId: string | null = null;
  
  try {
    const parsed = SyncBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id } = parsed.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Backend environment is not configured");

    supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    ) as any;
    
    // Get ecommerce config
    const { data: config, error: cfgErr } = await supabase
      .from("ecommerce_configs")
      .select("*")
      .eq("client_id", client_id)
      .single();
    
    if (cfgErr || !config) throw new Error("No ecommerce config found for client");
    currentConfigId = config.id;
    
    // Update status to syncing
    await supabase.from("ecommerce_configs").update({ sync_status: "syncing", sync_error: null }).eq("id", config.id);
    
    // Create sync log
    const { data: syncLog } = await supabase.from("sync_logs").insert({
      client_id,
      status: "running",
    }).select("id").single();
    currentSyncLogId = syncLog?.id || null;
    
    let rawProducts: any[] = [];
    
    try {
      switch (config.platform) {
        case "woocommerce":
          rawProducts = await fetchWooCommerce(config, supabase);
          break;
        case "shopify":
          rawProducts = await fetchShopify(config);
          break;
        case "prestashop":
          rawProducts = await fetchPrestaShop(config);
          break;
        case "api":
          rawProducts = await fetchCustomAPI(config);
          break;
        case "feed":
          if (config.feed_format === "csv") {
            rawProducts = await fetchCSVFeed(config);
          } else {
            rawProducts = await fetchXMLFeed(config);
          }
          break;
        default:
          throw new Error(`Unknown platform: ${config.platform}`);
      }
    } catch (fetchErr: any) {
      await supabase.from("ecommerce_configs").update({
        sync_status: "error",
        sync_error: fetchErr.message,
      }).eq("id", config.id);
      
      if (syncLog) {
        await supabase.from("sync_logs").update({
          ended_at: new Date().toISOString(),
          status: "error",
          errors: [{ message: fetchErr.message }],
        }).eq("id", syncLog.id);
      }
      throw fetchErr;
    }
    
    // Upsert products
    let synced = 0;
    let updated = 0;
    const errors: any[] = [];
    const syncedExternalIds: string[] = [];
    
    for (const p of rawProducts) {
      try {
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("client_id", client_id)
          .eq("external_id", p.external_id)
          .single();
        
        const record = {
          client_id,
          external_id: p.external_id,
          name: p.name,
          description: p.description,
          price: p.price,
          sale_price: p.sale_price,
          in_stock: p.in_stock,
          stock_quantity: p.stock_quantity,
          categories: p.categories,
          tags: p.tags,
          variants: p.variants,
          image_url: p.image_url,
          product_url: p.product_url,
          raw_data: p.raw_data,
          last_updated: new Date().toISOString(),
          is_active: true,
        };
        
        if (existing) {
          await supabase.from("products").update(record).eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("products").insert(record);
          synced++;
        }
        syncedExternalIds.push(p.external_id);
      } catch (e: any) {
        errors.push({ product: p.external_id, error: e.message });
      }
    }
    
    // Deactivate products not in this sync
    let deactivated = 0;
    if (syncedExternalIds.length > 0) {
      const { data: toDeactivate } = await supabase
        .from("products")
        .select("id")
        .eq("client_id", client_id)
        .eq("is_active", true)
        .not("external_id", "in", `(${syncedExternalIds.map(id => `"${id}"`).join(",")})`);
      
      if (toDeactivate?.length) {
        for (const d of toDeactivate) {
          await supabase.from("products").update({ is_active: false }).eq("id", d.id);
          deactivated++;
        }
      }
    }
    
    const now = new Date().toISOString();
    
    // Build product knowledge base
    const { data: allProducts } = await supabase
      .from("products")
      .select("*")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .order("name");
    
    const knowledgeText = buildProductKnowledge(allProducts || [], now);
    
    // Update chatbot config with product knowledge
    const { data: botConfig } = await supabase
      .from("chatbot_configs")
      .select("id")
      .eq("client_id", client_id)
      .single();
    
    if (botConfig) {
      await supabase.from("chatbot_configs").update({
        knowledge_base_products: knowledgeText,
      }).eq("id", botConfig.id);
    }
    
    // Update ecommerce config
    await supabase.from("ecommerce_configs").update({
      last_sync_at: now,
      sync_status: "success",
      sync_error: null,
    }).eq("id", config.id);
    
    // Update sync log
    if (syncLog) {
      await supabase.from("sync_logs").update({
        ended_at: now,
        products_synced: synced + updated,
        errors,
        status: errors.length ? "partial" : "success",
      }).eq("id", syncLog.id);
    }
    
    return new Response(JSON.stringify({
      synced, updated, deactivated, errors,
      total: rawProducts.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    
  } catch (error: any) {
    console.error("sync-products error:", error);
    if (supabase && currentConfigId) {
      await supabase.from("ecommerce_configs").update({
        sync_status: "error",
        sync_error: error.message,
      }).eq("id", currentConfigId);
    }
    if (supabase && currentSyncLogId) {
      await supabase.from("sync_logs").update({
        ended_at: new Date().toISOString(),
        status: "error",
        errors: [{ message: error.message }],
      }).eq("id", currentSyncLogId);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
