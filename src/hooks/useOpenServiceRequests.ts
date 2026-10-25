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
  const [urgent, setUrgent] = useState(false);
  const enabled = !!botId && module.id === "hotel" && canUseConciergeRequests;

  useEffect(() => {
    setCount(0);
    setUrgent(false);
    if (!enabled || !botId) return;
    let active = true;
    let revision = 0;
    const load = async () => {
      const currentRevision = ++revision;
      // Page through results so the API row limit cannot hide an urgent request.
      const rows: { id: string; category: string }[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("service_requests")
          .select("id, category").eq("bot_id", botId).eq("status", "open")
          .order("id").range(offset, offset + 999);
        if (!active || currentRevision !== revision || error) return;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      setCount(rows.length);
      setUrgent(rows.some((row) => /^problema/i.test(row.category.trim())));
    };
    void load();
    const channel = supabase.channel(`sidebar-requests-${botId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, () => {
        void load();
        if (localStorage.getItem(SERVICE_REQUEST_SOUND_KEY) === "true") playNotice();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, () => { void load(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [botId, enabled]);

  return { count, urgent, enabled };
}
