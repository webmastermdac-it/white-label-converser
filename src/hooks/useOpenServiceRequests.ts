import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveModule } from "@/hooks/useActiveModule";

export function useOpenServiceRequests() {
  const { botId, module } = useActiveModule();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!botId || module.id !== "hotel") { setCount(0); return; }
    const load = async () => {
      const { count: next } = await supabase.from("service_requests")
        .select("id", { count: "exact", head: true }).eq("bot_id", botId).eq("status", "open");
      setCount(next || 0);
    };
    void load();
    const channel = supabase.channel(`service-request-count-${botId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, load)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [botId, module.id]);

  return count;
}