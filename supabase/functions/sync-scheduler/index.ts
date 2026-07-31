import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const STALE_MINUTES = 300; // 5h: evita doppie sync se il cron gira ravvicinato

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data: configs, error } = await supabase
      .from("ecommerce_configs")
      .select("client_id, platform, sync_enabled, sync_status, last_sync_at")
      .eq("sync_enabled", true);

    if (error) throw error;

    const now = Date.now();
    const results: Array<Record<string, unknown>> = [];

    for (const config of configs || []) {
      const last = config.last_sync_at ? new Date(config.last_sync_at).getTime() : 0;
      const minutesSince = (now - last) / 60000;

      if (last && minutesSince < STALE_MINUTES) {
        results.push({ client_id: config.client_id, skipped: "recently_synced" });
        continue;
      }

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/sync-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ client_id: config.client_id }),
        });
        const bodyText = await res.text();
        if (!res.ok) {
          console.error(`sync-products failed [${res.status}] for ${config.client_id}: ${bodyText}`);
        }
        results.push({
          client_id: config.client_id,
          platform: config.platform,
          status: res.status,
        });
      } catch (e) {
        console.error(`sync-products error for ${config.client_id}:`, e);
        results.push({ client_id: config.client_id, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("sync-scheduler error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
