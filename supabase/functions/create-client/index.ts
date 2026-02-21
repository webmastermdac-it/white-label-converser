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

    const { name, email, password, plan } = await req.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 0. Check if client with this email already exists
    const { data: existing } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Un cliente con questa email esiste già" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create the client record
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .insert({ name, email, plan: plan || "starter" })
      .select()
      .single();

    if (clientError) throw clientError;

    // 2. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (authError) {
      // Rollback client
      await supabaseAdmin.from("clients").delete().eq("id", clientData.id);
      throw authError;
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
      full_name: name,
      client_id: clientData.id,
    });

    // 5. Create default chatbot config
    await supabaseAdmin.from("chatbot_configs").insert({
      client_id: clientData.id,
      name: `${name} Assistant`,
      welcome_message: `Ciao! Sono l'assistente di ${name}. Come posso aiutarti?`,
      notification_email: email,
    });

    return new Response(
      JSON.stringify({ success: true, client: clientData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("create-client error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
