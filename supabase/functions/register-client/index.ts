import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { full_name, company_name, email, password } = await req.json();

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

    // Check if client already exists
    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingClient) {
      return new Response(
        JSON.stringify({ error: "email_exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check auth users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authExists = existingUsers?.users?.some((u: any) => u.email === email);
    if (authExists) {
      return new Response(
        JSON.stringify({ error: "email_exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) throw authError;

    // 2. Create client record with free plan
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .insert({ name: company_name, email, plan: "free" })
      .select()
      .single();

    if (clientError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw clientError;
    }

    // 3. Assign role
    await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role: "client"
    });

    // 4. Link profile to client
    await supabaseAdmin.from("profiles").upsert({
      id: authData.user.id,
      email,
      full_name,
      client_id: clientData.id,
    });

    // 5. Create default chatbot config
    await supabaseAdmin.from("chatbot_configs").insert({
      client_id: clientData.id,
      name: `${company_name} Assistant`,
      welcome_message: `Ciao! Sono l'assistente di ${company_name}. Come posso aiutarti?`,
      notification_email: email,
    });

    // 6. Send welcome email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const appUrl = "https://chatbot.your-genius.com";
      const loginUrl = `${appUrl}/login`;

      const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#1A1A2E;padding:28px;text-align:center;">
    <img src="${appUrl}/images/genius-icon.png" alt="Genius" style="width:56px;height:56px;margin-bottom:12px;" />
    <h1 style="margin:0;font-size:22px;color:#ffffff;font-family:'Syne',sans-serif;">Genius Chatbot Builder</h1>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">🇮🇹 Ciao ${full_name}!</h2>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
      Il tuo account Genius Chatbot Builder è pronto.<br/>
      Accedi al tuo dashboard personale per configurare il tuo chatbot e iniziare a catturare lead automaticamente.
    </p>
    <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">🇬🇧 Hello ${full_name}!</h2>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
      Your Genius Chatbot Builder account is ready.<br/>
      Log in to your personal dashboard to configure your chatbot and start capturing leads automatically.
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:14px;color:#1a1a2e;">🔗 <strong>URL:</strong> <a href="${loginUrl}" style="color:#F59E0B;text-decoration:none;">${loginUrl}</a></p>
      <p style="margin:0;font-size:14px;color:#1a1a2e;">📧 <strong>Email:</strong> ${email}</p>
    </div>
    <div style="text-align:center;">
      <a href="${loginUrl}" style="display:inline-block;background:#F59E0B;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;">
        Accedi al Dashboard / Go to Dashboard
      </a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:18px 28px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;">Genius Chatbot Builder — Un prodotto MDAC S.r.l.</p>
    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">P.IVA 04333340984 | mdac@mdac.it</p>
    <p style="margin:0;font-size:11px;color:#9ca3af;">Per assistenza rispondi a questa email.</p>
  </div>
</div>
</body></html>`;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Genius Chatbot <onboarding@resend.dev>",
            to: [email],
            subject: "🧞 Benvenuto in Genius Chatbot Builder! / Welcome to Genius Chatbot Builder!",
            html: emailHtml,
          }),
        });
      } catch (emailErr) {
        console.error("Welcome email send error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, client: clientData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("register-client error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
