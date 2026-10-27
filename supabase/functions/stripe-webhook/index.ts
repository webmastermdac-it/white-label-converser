import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    log("ERROR: No signature header");
    return new Response(JSON.stringify({ error: "No signature" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );
  } catch (err: any) {
    log("Webhook signature verification failed", { message: err.message });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  log("Webhook received", { type: event.type });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session.metadata?.plan && !session.metadata?.offer && !session.metadata?.type) {
        log("Ignoring unrelated checkout session", { sessionId: session.id });
        return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Checkout pubblici: nessuna creazione di account e nessun impatto sul setup_service.
      if (session.metadata?.source === "landing_concierge") {
        const offer = session.metadata.offer;
        const email = session.customer_details?.email || session.customer_email || "";
        const phone = session.customer_details?.phone || "";
        const name = session.customer_details?.name || "";
        const interval = offer === "pro_month" ? "month" : "year";
        const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          try {
            const sdi = session.custom_fields?.find((f) => f.key === "sdi_pec")?.text?.value || "—";
            const amount = `${((session.amount_total || 0) / 100).toFixed(2)} ${String(session.currency || "eur").toUpperCase()} IVA inclusa`;
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `landing-concierge/${session.id}` },
              body: JSON.stringify({
                from: "Genius Chatbot <noreply@chatbot.your-genius.com>",
                to: [Deno.env.get("SETUP_NOTIFY_EMAIL") || "sviluppo@mdac.it"],
                subject: `Checkout Concierge pagato – ${offer} – ${name || email}`,
                html: `<h2>Nuovo pagamento Concierge AI</h2><p><b>Offerta:</b> ${esc(offer)}<br/><b>Nome:</b> ${esc(name)}<br/><b>Email:</b> ${esc(email)}<br/><b>Telefono:</b> ${esc(phone)}<br/><b>Importo:</b> ${esc(amount)}<br/><b>SDI/PEC:</b> ${esc(sdi)}</p>${["event", "setup"].includes(offer) ? "<p>Setup professionale da pianificare con il cliente</p>" : ""}`,
              }),
            });
            if (!res.ok) log("Public checkout email error", { status: res.status, body: await res.text() });
          } catch (err) { log("Public checkout email exception", { message: err instanceof Error ? err.message : "Unknown error" }); }
        } else log("Public checkout notification unavailable: RESEND_API_KEY missing");

        if (!["event", "pro_year", "pro_month", "setup"].includes(offer)) {
          log("Unrecognized public offer", { sessionId: session.id, offer });
          return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Exact email match; never interpret customer input as a query pattern.
        const { data: client, error: clientError } = email
          ? await supabase.from("clients").select("id").eq("email", email).maybeSingle()
          : { data: null, error: null };
        if (clientError) throw clientError;
        if (!client) {
          log("Public checkout: no existing client, notification only", { sessionId: session.id });
          return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (offer !== "setup") {
          let expiresAt: string | null = null;
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              const periodEnd = (sub.items?.data?.[0] as any)?.current_period_end;
              if (!periodEnd) throw new Error("current_period_end missing on subscription item");
              expiresAt = new Date(periodEnd * 1000).toISOString();
            } catch {
              const now = new Date();
              if (interval === "year") now.setFullYear(now.getFullYear() + 1); else now.setMonth(now.getMonth() + 1);
              expiresAt = now.toISOString();
            }
          }
          const { error } = await supabase.from("clients").update({
            plan: "pro", plan_interval: interval,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
            stripe_subscription_id: subscriptionId || null, plan_expires_at: expiresAt,
          }).eq("id", client.id);
          if (error) throw error;
        }
        if (offer === "event" || offer === "setup") {
          // Existing UNIQUE stripe_session_id makes webhook retries idempotent.
          const { error } = await supabase.from("setup_requests").upsert({
            client_id: client.id, status: "paid", paid_at: new Date().toISOString(), phone,
            amount_cents: offer === "event" ? 0 : 57000, currency: "eur", stripe_session_id: session.id,
          }, { onConflict: "stripe_session_id", ignoreDuplicates: true });
          if (error) throw error;
        }
        return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Setup professionale (pagamento singolo): gestito a parte, NON tocca gli abbonamenti
      if (session.metadata?.type === "setup_service") {
        const setupId = session.metadata?.setup_request_id;
        log("Setup service payment", { setupId, sessionId: session.id });
        if (setupId) {
          const { data: updated, error: upErr } = await supabase
            .from("setup_requests")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_intent: (session.payment_intent as string) || null,
            })
            .eq("id", setupId)
            .eq("status", "pending_payment")
            .select("id, client_id, phone, notes, amount_cents, currency");
          if (upErr) log("Error updating setup_request", { upErr });

          const reqRow = updated?.[0];
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (reqRow && RESEND_API_KEY) {
            try {
              const { data: cl } = await supabase.from("clients").select("name, email").eq("id", reqRow.client_id).maybeSingle();
              const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
              const amount = `${(reqRow.amount_cents / 100).toFixed(2)} ${String(reqRow.currency).toUpperCase()}`;
              const to = Deno.env.get("SETUP_NOTIFY_EMAIL") || "sviluppo@mdac.it";
              const html = `<h2>Nuovo Setup professionale pagato</h2>
<p><b>Cliente:</b> ${esc(cl?.name || "")}<br/><b>Email:</b> ${esc(cl?.email || session.customer_details?.email || "")}<br/><b>Telefono:</b> ${esc(reqRow.phone)}<br/><b>Importo:</b> ${esc(amount)}</p>
<p><b>Note:</b><br/>${esc(reqRow.notes || "—").replace(/\n/g, "<br/>")}</p>`;
              const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: `Genius Chatbot <noreply@chatbot.your-genius.com>`,
                  to: [to],
                  subject: `Setup professionale pagato – ${cl?.name || cl?.email || ""}`,
                  html,
                }),
              });
              if (!res.ok) log("Setup email error", { status: res.status, body: await res.text() });
            } catch (mailErr: any) {
              log("Setup email exception", { message: mailErr?.message });
            }
          }
        }
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      log("Session data", {
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
        customer_email: session.customer_email,
        customer_details_email: session.customer_details?.email,
      });

      const plan = session.metadata?.plan;
      if (!plan) {
        log("Ignoring checkout without a subscription plan", { sessionId: session.id });
        return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const interval = session.metadata?.interval || "month";
      const metaClientId = session.metadata?.client_id;
      const email = session.customer_email || session.customer_details?.email;

      log("Plan detection", { plan, interval, metaClientId, email });

      // Get subscription details for expiry
      let planExpiresAt: string | null = null;
      if (session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const periodEnd = (sub.items?.data?.[0] as any)?.current_period_end;
          if (!periodEnd) throw new Error("current_period_end missing on subscription item");
          planExpiresAt = new Date(periodEnd * 1000).toISOString();
          log("Subscription expiry", { planExpiresAt });
        } catch (subErr: any) {
          log("Error retrieving subscription", { message: subErr.message });
          // Calculate manually as fallback
          const now = new Date();
          if (interval === "year") {
            now.setFullYear(now.getFullYear() + 1);
          } else {
            now.setMonth(now.getMonth() + 1);
          }
          planExpiresAt = now.toISOString();
        }
      }

      const updatePayload = {
        plan,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan_interval: interval,
        plan_expires_at: planExpiresAt,
      };

      log("Update payload", updatePayload);

      // Strategy 1: Use client_id from metadata (most reliable)
      if (metaClientId) {
        log("Looking for client by client_id", { metaClientId });
        const { data: client, error } = await supabase
          .from("clients")
          .update(updatePayload)
          .eq("id", metaClientId)
          .select("id, email, plan")
          .single();

        if (error) {
          log("Error updating client by client_id", { error });
        } else {
          log("Client updated successfully by client_id", { client });
        }
      }
      // Strategy 2: Fallback to email
      else if (email) {
        log("Looking for client with email", { email });
        const { data: client, error } = await supabase
          .from("clients")
          .update(updatePayload)
          .eq("email", email)
          .select("id, email, plan")
          .single();

        if (error) {
          log("Error updating client by email", { error });
        } else {
          log("Client updated successfully by email", { client });
        }
      } else {
        log("ERROR: No client_id or email found in session");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      log("Subscription deleted", { customerId });

      const { data, error } = await supabase
        .from("clients")
        .update({
          plan: "free",
          stripe_subscription_id: null,
          plan_interval: null,
          plan_expires_at: null,
        })
        .eq("stripe_customer_id", customerId)
        .select("id, email, plan");

      if (error) log("Error downgrading client", { error });
      else log("Client downgraded to free", { data });
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const item: any = sub.items?.data?.[0];
      log("Subscription updated", { customerId, status: sub.status, priceId: item?.price?.id });

      if (["canceled", "unpaid", "incomplete_expired"].includes(sub.status)) {
        const { data, error } = await supabase
          .from("clients")
          .update({ plan: "free", stripe_subscription_id: null, plan_interval: null, plan_expires_at: null })
          .eq("stripe_customer_id", customerId)
          .select("id, email, plan");
        if (error) log("Error downgrading client", { error });
        else log("Client downgraded to free", { data });
      } else if (sub.status === "past_due") {
        log("Subscription past_due: plan unchanged", { customerId });
      } else {
        const priceId = item?.price?.id;
        const { data: rows } = priceId
          ? await supabase
              .from("plan_configs")
              .select("plan_name, stripe_price_month, stripe_price_year")
              .or(`stripe_price_month.eq.${priceId},stripe_price_year.eq.${priceId}`)
              .limit(1)
          : { data: null };
        const match = rows?.[0];
        if (!match) {
          log("Unrecognized price ID, no changes", { priceId });
        } else {
          const planInterval = match.stripe_price_year === priceId ? "year" : "month";
          const payload: Record<string, unknown> = {
            plan: match.plan_name,
            plan_interval: planInterval,
            stripe_subscription_id: sub.id,
          };
          if (item?.current_period_end) {
            payload.plan_expires_at = new Date(item.current_period_end * 1000).toISOString();
          }
          const { data, error } = await supabase
            .from("clients")
            .update(payload)
            .eq("stripe_customer_id", customerId)
            .select("id, email, plan");
          if (error) log("Error updating client subscription", { error });
          else log("Client subscription updated", { data, payload });
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      log("Invoice payment failed", { customer: invoice.customer, invoiceId: invoice.id });
    }

    // Always return 200 to prevent Stripe retries
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    log("Webhook processing error", { message: error.message, stack: error.stack });
    // Still return 200 to prevent Stripe retries
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
