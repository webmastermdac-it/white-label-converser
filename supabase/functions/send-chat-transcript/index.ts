import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id, to_email } = await req.json();
    if (!session_id || !to_email) {
      return new Response(JSON.stringify({ error: "Missing session_id or to_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: super_admin, or client owner of the session
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("id, messages, source_url, started_at, client_id, clients(name)")
      .eq("id", session_id)
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (roleRow?.role !== "super_admin") {
      const { data: profile } = await supabase
        .from("profiles").select("client_id").eq("id", user.id).maybeSingle();
      if (!profile?.client_id || profile.client_id !== session.client_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = Array.isArray(session.messages) ? session.messages : [];
    const rows = messages.map((m: any) => {
      const isUser = m.role === "user";
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:${isUser ? "#111" : "#444"}">
        <strong>${isUser ? "Utente" : "Bot"}:</strong> ${esc(m.content)}
      </td></tr>`;
    }).join("");

    const clientName = (session as any).clients?.name || "—";
    const html = `<!doctype html><html><body style="background:#f4f4f5;padding:24px;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px">
        <h2 style="margin:0 0 4px;font-size:18px">Trascrizione chat</h2>
        <p style="margin:0 0 16px;font-size:12px;color:#666">
          Cliente: ${esc(clientName)}<br/>
          Origine: ${esc(session.source_url || "Direct")}<br/>
          Data: ${new Date(session.started_at).toLocaleString("it-IT")}<br/>
          Messaggi: ${messages.length}
        </p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
    </body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Genius <noreply@chatbot.your-genius.com>`,
        to: [to_email],
        subject: `Trascrizione chat — ${clientName}`,
        html,
      }),
    });
    const resData = await res.json();
    if (!res.ok) {
      console.error("Resend error:", resData);
      return new Response(JSON.stringify({ error: resData.message || "Email send failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-chat-transcript error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
