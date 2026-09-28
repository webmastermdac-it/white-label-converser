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
              const amount = `${(reqRow.amount_cents / 100).toFixed(2)} ${String(reqRow.currency).toUpperCase()} + IVA`;
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

      const plan = session.metadata?.plan || "starter";
      const interval = session.metadata?.interval || "month";
      const metaClientId = session.metadata?.client_id;
      const email = session.customer_email || session.customer_details?.email;

      log("Plan detection", { plan, interval, metaClientId, email });

      // Get subscription details for expiry
      let planExpiresAt: string | null = null;
      if (session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          planExpiresAt = new Date(sub.current_period_end * 1000).toISOString();
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
