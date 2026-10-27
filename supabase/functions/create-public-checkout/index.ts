import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Usare POST con una offerta valida." }, 405);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: "JSON non valido." }, 400); }
  const offer = body && typeof body === "object" && "offer" in body ? body.offer : null;
  if (typeof offer !== "string" || !["event", "pro_year", "pro_month", "setup"].includes(offer)) {
    return json({ error: "Offerta non valida: event, pro_year, pro_month o setup." }, 400);
  }
  // 31/12/2026 23:59 Europe/Rome (UTC+1), incluso tutto l'ultimo minuto.
  if (offer === "event" && Date.now() >= Date.parse("2027-01-01T00:00:00+01:00")) {
    return json({ error: "Offerta evento scaduta il 31/12/2026 alle 23:59 (Europe/Rome)." }, 410);
  }
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const base = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !base || !serviceKey) throw new Error("Configurazione checkout non disponibile.");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const admin = createClient(base, serviceKey);
    const interval = offer === "pro_month" ? "month" : "year";
    const metadata: Record<string, string> = { offer, plan: "pro", source: "landing_concierge" };
    if (offer !== "setup") metadata.interval = interval;
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: offer === "setup" ? "payment" : "subscription",
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      phone_number_collection: { enabled: true },
      custom_fields: [{ key: "sdi_pec", label: { type: "custom", custom: "Codice SDI o PEC" }, type: "text", optional: true }],
      metadata,
      success_url: `https://conciergeai.your-genius.com/?pagamento=ok&offerta=${offer}#prezzi`,
      cancel_url: "https://conciergeai.your-genius.com/?pagamento=annullato#prezzi",
    };
    if (offer !== "event") params.allow_promotion_codes = true;
    if (offer === "setup") {
      const rates = await stripe.taxRates.list({ active: true, limit: 100 });
      let rate = rates.data.find((r) => r.inclusive && r.percentage === 22 && r.country === "IT" && r.display_name === "IVA");
      if (!rate) rate = await stripe.taxRates.create({
        display_name: "IVA", description: "IVA 22%", percentage: 22, inclusive: true, country: "IT", jurisdiction: "IT",
      }, { idempotencyKey: "public-checkout-iva22-inclusive-v1" });
      params.line_items = [{ price_data: {
        currency: "eur", unit_amount: 57000,
        product_data: { name: "Setup professionale chatbot" },
      }, quantity: 1, tax_rates: [rate.id] }];
      params.invoice_creation = { enabled: true };
      params.payment_intent_data = { metadata };
    } else {
      const { data: plan, error } = await admin.from("plan_configs")
        .select("stripe_price_year, stripe_price_month").eq("plan_name", "pro").maybeSingle();
      if (error) throw new Error("Impossibile leggere il prezzo Pro.");
      const priceId = interval === "year" ? plan?.stripe_price_year : plan?.stripe_price_month;
      if (!priceId) return json({ error: `Prezzo Pro ${interval === "year" ? "annuale" : "mensile"} non configurato.` }, 503);
      params.line_items = [{ price: priceId, quantity: 1 }];
      params.subscription_data = { metadata };
      if (offer === "event") {
        const price = await stripe.prices.retrieve(priceId);
        if (!price.active || price.currency !== "eur" || price.unit_amount !== 149000 || price.recurring?.interval !== "year" || price.recurring.interval_count !== 1) {
          return json({ error: "Offerta evento non disponibile: il prezzo Pro annuale deve essere 1490 € IVA inclusa." }, 503);
        }
        let coupon: Stripe.Coupon;
        try { coupon = await stripe.coupons.retrieve("EVENTO_HFTP_990"); }
        catch (err) {
          if (!err || typeof err !== "object" || !("code" in err) || err.code !== "resource_missing") throw err;
          coupon = await stripe.coupons.create({ id: "EVENTO_HFTP_990", amount_off: 50000, currency: "eur", duration: "once", name: "Evento HFTP: Pro + setup incluso" }, { idempotencyKey: "EVENTO_HFTP_990-create-v2" });
        }
        if (!coupon.valid || coupon.amount_off !== 50000 || coupon.currency !== "eur" || coupon.duration !== "once" || coupon.applies_to?.products?.length) {
          return json({ error: "Coupon evento non disponibile o non conforme." }, 503);
        }
        params.discounts = [{ coupon: coupon.id }];
      }
    }
    const session = await stripe.checkout.sessions.create(params);
    if (offer === "event" && (session.amount_total !== 99000 || session.currency !== "eur")) {
      await stripe.checkout.sessions.expire(session.id);
      return json({ error: "Totale evento non conforme: checkout annullato." }, 503);
    }
    if (!session.url) throw new Error("Stripe non ha restituito un URL di checkout.");
    console.log("[CREATE-PUBLIC-CHECKOUT] Session created", { offer, sessionId: session.id, amount_total: session.amount_total });
    return json({ url: session.url });
  } catch (error) {
    console.error("[CREATE-PUBLIC-CHECKOUT]", error instanceof Error ? error.message : "Errore interno");
    return json({ error: "Impossibile avviare il checkout. Riprova o contatta il team." }, 502);
  }
});