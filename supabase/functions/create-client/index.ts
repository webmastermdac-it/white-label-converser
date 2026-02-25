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

    const { name, email, password, plan, locale: reqLocale } = await req.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: existingClient } = await supabaseAdmin.from("clients").select("id").eq("email", email).maybeSingle();
    if (existingClient) {
      return new Response(JSON.stringify({ error: "Un cliente con questa email esiste già" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    if (existingUsers?.users?.some((u: any) => u.email === email)) {
      return new Response(JSON.stringify({ error: "Un utente con questa email esiste già nel sistema" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients").insert({ name, email, plan: plan || "starter" }).select().single();
    if (clientError) throw clientError;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name }
    });
    if (authError) { await supabaseAdmin.from("clients").delete().eq("id", clientData.id); throw authError; }

    const locale: Locale = resolveLocale(reqLocale);

    await supabaseAdmin.from("user_roles").insert({ user_id: authData.user.id, role: "client" });
    await supabaseAdmin.from("profiles").upsert({ id: authData.user.id, email, full_name: name, client_id: clientData.id, language: locale });
    await supabaseAdmin.from("chatbot_configs").insert({
      client_id: clientData.id,
      name: `${name} Assistant`,
      welcome_message: `Ciao! Sono l'assistente di ${name}. Come posso aiutarti?`,
      notification_email: email,
    });

    // Send welcome email with temporary password
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const brand = await fetchBrandSettings(supabaseAdmin);
      const loginUrl = "https://chatbot.your-genius.com/login";
      const customTpl = await fetchCustomTemplate(supabaseAdmin, "welcome", locale);

      let emailHtml: string;
      let subject: string;
      if (customTpl) {
        const vars = { "{{nome}}": name, "{{email}}": email, "{{link}}": loginUrl, "{{app_name}}": brand.app_name, "{{logo_url}}": brand.logo_url || "", "{{password}}": password };
        emailHtml = renderCustomTemplate(brand, customTpl, vars);
        subject = replaceSubjectVars(customTpl.subject, vars);
      } else {
        emailHtml = welcomeEmail(brand, name, email, loginUrl, password, locale);
        subject = welcomeSubject(brand, name, locale);
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
    console.error("create-client error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
