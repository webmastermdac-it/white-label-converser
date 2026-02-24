import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { to_email, bot_name } = await req.json();

    if (!to_email) {
      return new Response(JSON.stringify({ error: "Missing to_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const dashboardUrl = "https://white-label-converser.lovable.app/dashboard/leads";
    const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#E94560;padding:24px 28px;">
    <h1 style="margin:0;font-size:22px;color:#ffffff;">✅ Email di Test Riuscita!</h1>
    <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${bot_name || "Genius Chatbot"}</p>
  </div>
  <div style="padding:28px;">
    <p style="font-size:15px;color:#1a1a2e;line-height:1.6;">Le notifiche email sono configurate correttamente. Riceverai una notifica ogni volta che un nuovo lead viene catturato dal chatbot.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#166534;">📧 Destinatario: <strong>${to_email}</strong></p>
      <p style="margin:6px 0 0;font-size:13px;color:#166534;">🕐 Inviato il: ${now}</p>
    </div>
    <div style="text-align:center;margin-top:28px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#E94560;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;font-size:14px;">
        Vai al Dashboard →
      </a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">Genius Chatbot Builder — Un prodotto MDAC S.r.l.</p>
  </div>
</div>
</body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Genius Chatbot <onboarding@resend.dev>",
        to: [to_email],
        subject: `✅ Test Notifica - ${bot_name || "Genius Chatbot"}`,
        html: emailHtml,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error("Resend error:", resData);
      return new Response(JSON.stringify({ error: resData.message || "Email send failed", details: resData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("send-test-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
