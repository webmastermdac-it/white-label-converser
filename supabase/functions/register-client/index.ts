import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchBrandSettings, welcomeEmail, welcomeSubject, fetchCustomTemplate, renderCustomTemplate, replaceSubjectVars, resolveLocale, type Locale } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { full_name, company_name, email, password, locale: reqLocale, vertical } = await req.json();
    const normalizedVertical = vertical === "hospitality" ? "hotel" : vertical;
    const allowedVerticals = ["booking", "ecommerce", "hotel", "general"];
    const safeVertical = allowedVerticals.includes(normalizedVertical) ? normalizedVertical : "general";

    if (!full_name || !company_name || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: existingClient } = await supabaseAdmin.from("clients").select("id").eq("email", email).maybeSingle();
    if (existingClient) {
      return new Response(JSON.stringify({ error: "email_exists" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    if (existingUsers?.users?.some((u: any) => u.email === email)) {
      // 200 so the client can read the code and show a field error (non-2xx hides the body)
      return new Response(JSON.stringify({ error: "email_exists" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name }
    });
    if (authError) {
      const code = (authError as any).code;
      if (code === "weak_password" || /weak|easy to guess|pwned/i.test(authError.message)) {
        return new Response(JSON.stringify({ error: "weak_password" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw authError;
    }

    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients").insert({ name: company_name, email, plan: "free" }).select().single();
    if (clientError) { await supabaseAdmin.auth.admin.deleteUser(authData.user.id); throw clientError; }

    // Resolve locale: use requested locale or default to 'it'
    const locale: Locale = resolveLocale(reqLocale);

    await supabaseAdmin.from("user_roles").insert({ user_id: authData.user.id, role: "client" });
    await supabaseAdmin.from("profiles").upsert({ id: authData.user.id, email, full_name, client_id: clientData.id, language: locale });
    const ECOMMERCE_KB_IT = `Quando presenti un prodotto, oltre a nome/prezzo/disponibilità, suggerisci sempre in modo naturale (non forzato) un prodotto complementare del catalogo se pertinente, con una frase tipo "spesso acquistato insieme a...".
Se un prodotto ha disponibilità limitata (es. sotto 5 pezzi), menzionalo con naturalezza per creare urgenza onesta, senza esagerare o inventare numeri non presenti nel catalogo.
Se l'utente esprime dubbi su spedizione, tempi di consegna, resi o pagamento, rispondi usando le informazioni disponibili nella knowledge base; se non le trovi, non inventare — invita l'utente a lasciare il contatto per essere ricontattato con l'informazione esatta.
Se l'utente sembra indeciso o interrompe la conversazione senza aver aggiunto nulla al carrello dopo aver mostrato interesse per un prodotto, chiedi gentilmente se vuole lasciare la sua email per ricevere un promemoria o un aiuto extra, prima di chiudere la conversazione.`;

    const ECOMMERCE_KB_EN = `When presenting a product, besides name/price/availability, always naturally suggest (never pushy) a complementary product from the catalog when relevant, with a phrase like "often bought together with...".
If a product has limited availability (e.g. under 5 units), mention it naturally to create honest urgency, without exaggerating or inventing numbers not present in the catalog.
If the user raises doubts about shipping, delivery times, returns or payment, answer using the information available in the knowledge base; if you can't find it, don't make it up — invite the user to leave their contact to be followed up with the exact information.
If the user seems undecided or drops the conversation without adding anything to the cart after showing interest in a product, gently ask if they'd like to leave their email to receive a reminder or extra help, before closing the conversation.`;

    await supabaseAdmin.from("chatbot_configs").insert({
      client_id: clientData.id,
      name: `${company_name} Assistant`,
      welcome_message: `Ciao! Sono l'assistente virtuale IA di ${company_name}. Come posso aiutarti?`,
      notification_email: email,
      business_vertical: safeVertical,
      vertical: safeVertical,
      ...(safeVertical === "ecommerce"
        ? { knowledge_base: locale === "it" ? ECOMMERCE_KB_IT : ECOMMERCE_KB_EN }
        : {}),
    });

    // Send welcome email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const brand = await fetchBrandSettings(supabaseAdmin);
      const loginUrl = "https://chatbot.your-genius.com/login";
      const customTpl = await fetchCustomTemplate(supabaseAdmin, "welcome", locale);
      
      let emailHtml: string;
      let subject: string;
      if (customTpl) {
        const vars = { "{{nome}}": full_name, "{{email}}": email, "{{link}}": loginUrl, "{{app_name}}": brand.app_name, "{{logo_url}}": brand.logo_url || "" };
        emailHtml = renderCustomTemplate(brand, customTpl, vars);
        subject = replaceSubjectVars(customTpl.subject, vars);
      } else {
        emailHtml = welcomeEmail(brand, full_name, email, loginUrl, undefined, locale);
        subject = welcomeSubject(brand, full_name, locale);
      }

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${brand.app_name} <noreply@chatbot.your-genius.com>`,
            to: [email],
            subject,
            html: emailHtml,
          }),
        });
      } catch (emailErr) { console.error("Welcome email error:", emailErr); }
    }

    return new Response(JSON.stringify({ success: true, client: clientData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("register-client error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
