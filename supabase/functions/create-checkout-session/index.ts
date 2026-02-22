import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICES: Record<string, Record<string, string>> = {
  starter: {
    month: "price_1T3FrlCK92CnCFRSGWBF7jcb",
    year: "price_1T3Fs0CK92CnCFRSiW6kleSr",
  },
  pro: {
    month: "price_1T3FsECK92CnCFRSvfDFHiUt",
    year: "price_1T3FsWCK92CnCFRSWK4odPK8",
  },
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { plan, interval, email, client_id } = await req.json();
    log("Request received", { plan, interval, email, client_id });

    if (!plan || !interval || !PRICES[plan]?.[interval]) {
      return new Response(JSON.stringify({ error: "Invalid plan or interval" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      log("Existing Stripe customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://genius-chatbot.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: PRICES[plan][interval], quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?payment=success&plan=${plan}`,
      cancel_url: `${origin}/dashboard/upgrade`,
      metadata: {
        plan,
        interval,
        client_id: client_id || "",
        email: email || "",
      },
    });

    log("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    log("Error", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
