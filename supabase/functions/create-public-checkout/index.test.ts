import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const loadHandler = (file: string, stripe: object, admin: object, now = Date.parse("2026-10-27T17:10:00Z"), fetcher = async () => new Response("{}")) => {
  const source = readFileSync(new URL(file, import.meta.url), "utf8").replace(/^import .*;\n/gm, "").replace(/const corsHeaders = \{[\s\S]*?\};/, "");
  const js = new Bun.Transpiler({ loader: "ts" }).transformSync(source);
  let handler: (req: Request) => Promise<Response> = async () => new Response("missing", { status: 500 });
  class FakeStripe { constructor() { return stripe; } }
  class Clock extends Date { static now() { return now; } }
  new Function("serve", "Stripe", "createClient", "Deno", "corsHeaders", "Date", "fetch", js)(
    (fn: typeof handler) => { handler = fn; }, FakeStripe, () => admin,
    { env: { get: () => "configured-for-test" } }, { "Access-Control-Allow-Origin": "*" }, Clock, fetcher,
  );
  return handler;
};

const fixture = () => {
  let params: any;
  const stripe = {
    prices: { retrieve: async () => ({ active: true, currency: "eur", unit_amount: 149000, recurring: { interval: "year", interval_count: 1 } }) },
    coupons: { retrieve: async () => ({ id: "EVENTO_HFTP_990", valid: true, amount_off: 50000, currency: "eur", duration: "once" }) },
    taxRates: { list: async () => ({ data: [{ id: "tax_test", inclusive: true, percentage: 22, country: "IT", display_name: "IVA" }] }) },
    checkout: { sessions: { create: async (p: any) => { params = p; return { id: "cs_test", url: "https://checkout.stripe.com/test", amount_total: p.discounts ? 99000 : p.mode === "payment" ? 57000 : 149000, currency: "eur" }; }, expire: async () => {} } },
  };
  const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { stripe_price_year: "price_year", stripe_price_month: "price_month" } }) };
  return { stripe, admin: { from: () => query }, params: () => params };
};
const post = (offer: string) => new Request("https://example.com", { method: "POST", body: JSON.stringify({ offer }) });

describe("Public Concierge checkout rules", () => {
  test("event is EUR990 first year using EUR500 once coupon and configured annual price", async () => {
    const f = fixture();
    expect((await loadHandler("./index.ts", f.stripe, f.admin)(post("event"))).status).toBe(200);
    expect(f.params().line_items).toEqual([{ price: "price_year", quantity: 1 }]);
    expect(f.params().discounts).toEqual([{ coupon: "EVENTO_HFTP_990" }]);
    expect(f.params().allow_promotion_codes).toBeUndefined();
    expect(f.params().subscription_data.metadata).toEqual({ offer: "event", plan: "pro", interval: "year", source: "landing_concierge" });
    expect(f.params().customer_email).toBeUndefined();
  });
  test("event expires after 31 December 2026 23:59 Europe/Rome", async () => {
    const f = fixture();
    expect((await loadHandler("./index.ts", f.stripe, f.admin, Date.parse("2026-12-31T23:59:59+01:00"))(post("event"))).status).toBe(200);
    expect((await loadHandler("./index.ts", f.stripe, f.admin, Date.parse("2027-01-01T00:00:00+01:00"))(post("event"))).status).toBe(410);
  });
  test("setup is EUR570 with inclusive 22% tax, invoices and no subscription interval", async () => {
    const f = fixture();
    await loadHandler("./index.ts", f.stripe, f.admin)(post("setup"));
    expect(f.params().mode).toBe("payment");
    expect(f.params().line_items[0].price_data.unit_amount).toBe(57000);
    expect(f.params().line_items[0].tax_rates).toEqual(["tax_test"]);
    expect(f.params().invoice_creation.enabled).toBe(true);
    expect(f.params().metadata.interval).toBeUndefined();
    expect(f.params().payment_intent_data.metadata.source).toBe("landing_concierge");
  });
  test("pro_month uses configured monthly price and accepts promotion codes", async () => {
    const f = fixture();
    await loadHandler("./index.ts", f.stripe, f.admin)(post("pro_month"));
    expect(f.params().line_items[0].price).toBe("price_month");
    expect(f.params().subscription_data.metadata.interval).toBe("month");
    expect(f.params().allow_promotion_codes).toBe(true);
  });
  test("pro_year uses configured yearly price", async () => {
    const f = fixture();
    await loadHandler("./index.ts", f.stripe, f.admin)(post("pro_year"));
    expect(f.params().line_items[0].price).toBe("price_year");
    expect(f.params().subscription_data.metadata.interval).toBe("year");
  });
  test("rejects unsupported offers without creating a session", async () => {
    const f = fixture();
    expect((await loadHandler("./index.ts", f.stripe, f.admin)(post("starter"))).status).toBe(400);
    expect(f.params()).toBeUndefined();
  });
});

describe("Public checkout webhook isolation", () => {
  const run = async (session: any, client: any = null) => {
    const updates: any[] = [], setups: any[] = [], emails: any[] = [];
    const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: client }), then: (resolve: any) => resolve({ error: null }), update: (p: any) => { updates.push(p); return query; }, upsert: (p: any, options: any) => { setups.push({ p, options }); return query; } };
    const stripe = { webhooks: { constructEventAsync: async () => ({ type: "checkout.session.completed", data: { object: session } }) }, subscriptions: { retrieve: async () => ({ items: { data: [{ current_period_end: 1800000000 }] } }) } };
    const handler = loadHandler("../stripe-webhook/index.ts", stripe, { from: () => query }, undefined, async (_url: any, init: any) => { emails.push(JSON.parse(init.body)); return new Response("{}"); });
    const response = await handler(new Request("https://example.com", { method: "POST", headers: { "stripe-signature": "mock-verified-in-test" }, body: "{}" }));
    return { response, updates, setups, emails };
  };
  test("unrelated checkout must not default to Starter", async () => {
    const r = await run({ id: "cs_other", metadata: {} }, { id: "client" });
    expect(r.response.status).toBe(200);
    expect(r.updates.length).toBe(0);
  });
  test("unknown public customer gets notification without account creation", async () => {
    const r = await run({ id: "cs_event", metadata: { source: "landing_concierge", offer: "event" }, customer_details: { email: "test@example.invalid", phone: "test" }, amount_total: 99000 });
    expect(r.emails.length).toBe(1);
    expect(r.emails[0].html).toContain("Setup professionale da pianificare con il cliente");
    expect(r.updates.length).toBe(0);
    expect(r.setups.length).toBe(0);
  });
  test("event upgrades an existing client to Pro year and records included setup as zero", async () => {
    const r = await run({ id: "cs_event", metadata: { source: "landing_concierge", offer: "event" }, subscription: "sub_test", customer: "cus_test", customer_details: { email: "test@example.invalid", phone: "test" }, amount_total: 99000 }, { id: "client" });
    expect(r.updates[0].plan).toBe("pro");
    expect(r.updates[0].plan_interval).toBe("year");
    expect(r.setups[0].p.amount_cents).toBe(0);
    expect(r.setups[0].options).toEqual({ onConflict: "stripe_session_id", ignoreDuplicates: true });
  });
  test("setup records EUR570 without changing subscription", async () => {
    const r = await run({ id: "cs_setup", metadata: { source: "landing_concierge", offer: "setup", plan: "pro" }, customer_details: { email: "test@example.invalid", phone: "test" } }, { id: "client" });
    expect(r.updates.length).toBe(0);
    expect(r.setups[0].p.amount_cents).toBe(57000);
    expect(r.setups[0].p.status).toBe("paid");
  });
});