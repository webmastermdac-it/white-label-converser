import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveModule } from "@/hooks/useActiveModule";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { playNotice, SERVICE_REQUEST_SOUND_KEY } from "@/lib/playNotice";

/** Open service requests of the active hotel bot, live via Realtime. */
export function useOpenServiceRequests() {
  const { botId, module } = useActiveModule();
  const { canUseConciergeRequests } = usePlanConfig();
  const [count, setCount] = useState(0);
  const enabled = !!botId && module.id === "hotel" && canUseConciergeRequests;

  useEffect(() => {
    if (!enabled || !botId) { setCount(0); return; }
    const load = async () => {
      const { count: next } = await supabase.from("service_requests")
        .select("id", { count: "exact", head: true }).eq("bot_id", botId).eq("status", "open");
      setCount(next || 0);
    };
    void load();
    const channel = supabase.channel(`sidebar-requests-${botId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, () => {
        void load();
        if (localStorage.getItem(SERVICE_REQUEST_SOUND_KEY) === "true") playNotice();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [botId, enabled]);

  return { count, enabled };
}
