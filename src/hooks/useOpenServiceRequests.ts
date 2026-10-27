import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveModule } from "@/hooks/useActiveModule";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { toast } from "sonner";
import { playNotice, soundEnabled } from "@/lib/playNotice";
import { tx } from "@/hooks/useLanguage";

/** Open service requests of the active hotel bot, live via Realtime. */
export function useOpenServiceRequests(canPlaySound: () => boolean = () => true) {
  const soundAllowed = useRef(canPlaySound);
  soundAllowed.current = canPlaySound;
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, (payload) => {
        const row = (payload?.new ?? {}) as { category?: string; room?: string | null };
        // Show it right away; load() below reconciles with the database.
        setCount((c) => c + 1);
        if (/^problema/i.test((row.category || "").trim())) setUrgent(true);
        toast.info(`${row.category || tx("New request", "Nuova richiesta")}${row.room ? ` · ${row.room}` : ""}`, { description: tx("New request from a guest", "Nuova richiesta da un ospite") });
        void load();
        if (soundAllowed.current() && soundEnabled()) playNotice();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, () => { void load(); })
      .subscribe();
    // Safety net: if the realtime connection silently drops, still catch up.
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(poll); document.removeEventListener("visibilitychange", onVisible); void supabase.removeChannel(channel); };
  }, [botId, enabled]);

  return { count, urgent, enabled };
}
