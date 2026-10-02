import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-SETUP-CHECKOUT] ${step}${d}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const notesRaw = typeof body?.notes === "string" ? body.notes.trim() : "";
    if (phone.length < 6 || phone.length > 40) return json({ error: "Numero di telefono non valido (minimo 6 caratteri)." }, 400);
    if (notesRaw.length > 1000) return json({ error: "Le note possono contenere al massimo 1000 caratteri." }, 400);
    const notes = notesRaw || null;

    const { data: profile } = await admin.from("profiles").select("client_id").eq("id", userId).maybeSingle();
    const clientId = profile?.client_id;
    if (!clientId) return json({ error: "Nessun cliente associato a questo account." }, 400);
    const { data: client } = await admin.from("clients").select("id, email").eq("id", clientId).maybeSingle();
    if (!client?.email) return json({ error: "Cliente non trovato." }, 400);

    const { data: active } = await admin.from("setup_requests").select("id")
      .eq("client_id", clientId).in("status", ["paid", "contacted", "in_progress"]).limit(1);
    if (active && active.length > 0) {
      return json({ error: "Hai già una richiesta di Setup professionale attiva. Il nostro team ti contatterà a breve." }, 409);
    }

    await admin.from("setup_requests").update({ status: "cancelled" })
      .eq("client_id", clientId).eq("status", "pending_payment");

    const { data: row, error: insErr } = await admin.from("setup_requests")
      .insert({ client_id: clientId, phone, notes, status: "pending_payment", amount_cents: 57000, currency: "eur" }).select("id").single();
    if (insErr || !row) throw insErr || new Error("Insert failed");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const taxRates = await stripe.taxRates.list({ active: true, limit: 100 });
    let taxRate = taxRates.data.find((rate) =>
      rate.inclusive && rate.percentage === 22 && rate.country === "IT" && rate.display_name === "IVA"
    );
    if (!taxRate) {
      taxRate = await stripe.taxRates.create({
        display_name: "IVA",
        description: "IVA 22%",
        percentage: 22,
        inclusive: true,
        country: "IT",
        jurisdiction: "IT",
      });
    }
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://genius-chatbot.lovable.app";
    const metadata = { type: "setup_service", setup_request_id: row.id, client_id: clientId };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: client.email,
      line_items: [{
        price_data: {
          currency: "eur",
          unit_amount: 57000,
          product_data: {
            name: "Setup professionale chatbot",
            description: "Installazione, configurazione e test del chatbot insieme al team, con consigli su tone of voice e utilizzo",
          },
        },
        quantity: 1,
        tax_rates: [taxRate.id],
      }],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      invoice_creation: { enabled: true },
      custom_fields: [{
        key: "sdi_pec",
        label: { type: "custom", custom: "Codice SDI o PEC" },
        type: "text",
        optional: true,
      }],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/dashboard/upgrade?setup=success`,
      cancel_url: `${origin}/dashboard/upgrade?setup=cancel`,
    });

    await admin.from("setup_requests").update({ stripe_session_id: session.id }).eq("id", row.id);
    log("Session created", { sessionId: session.id, setup_request_id: row.id });

    return json({ url: session.url });
  } catch (error: any) {
    log("Error", { message: error?.message });
    return json({ error: error?.message || "Errore interno" }, 500);
  }
});
