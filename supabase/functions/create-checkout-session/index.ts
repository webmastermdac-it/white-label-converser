import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const plan = typeof body?.plan === "string" ? body.plan : "";
    const interval = body?.interval === "year" ? "year" : body?.interval === "month" ? "month" : "";
    log("Request received", { plan, interval, userId: userData.user.id });

    if (!plan || !interval) return json({ error: "Invalid plan or interval" }, 400);

    const { data: planRow } = await supabase
      .from("plan_configs")
      .select("stripe_price_month, stripe_price_year")
      .eq("plan_name", plan)
      .maybeSingle();
    const priceId = interval === "year" ? planRow?.stripe_price_year : planRow?.stripe_price_month;
    if (!priceId) return json({ error: "Piano non configurato" }, 400);

    const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", userData.user.id).maybeSingle();
    const client_id = profile?.client_id;
    if (!client_id) return json({ error: "Nessun cliente associato a questo account." }, 400);
    const { data: client } = await supabase.from("clients").select("email").eq("id", client_id).maybeSingle();
    const email = client?.email;
    if (!email) return json({ error: "Cliente non trovato." }, 400);

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

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://genius-chatbot.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?payment=success&plan=${plan}`,
      cancel_url: `${origin}/dashboard/upgrade`,
      metadata: {
        plan,
        interval,
        client_id,
        email,
      },
    });

    log("Checkout session created", { sessionId: session.id, url: session.url });

    return json({ url: session.url });
  } catch (error: any) {
    log("Error", { message: error.message });
    return json({ error: error.message }, 500);
  }
});
