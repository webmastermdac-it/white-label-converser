import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveModule } from "@/hooks/useActiveModule";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { toast } from "sonner";
import { playNotice, soundEnabled } from "@/lib/playNotice";
import { tx } from "@/hooks/useLanguage";

/** Fired by the requests page right after a status change so the lamp reacts at once. */
export const SERVICE_REQUESTS_CHANGED_EVENT = "genius-service-requests-changed";
export const notifyServiceRequestsChanged = (detail?: { from?: string; to?: string; category?: string }) =>
  window.dispatchEvent(new CustomEvent(SERVICE_REQUESTS_CHANGED_EVENT, { detail }));

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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, (payload) => {
        // A guest follow-up in an existing thread alerts the staff like a new request (the request is open again).
        const row = (payload?.new ?? {}) as { category?: string; room?: string | null; last_guest_message_at?: string | null };
        const previous = (payload?.old ?? {}) as { last_guest_message_at?: string | null };
        if (row.last_guest_message_at && row.last_guest_message_at !== previous.last_guest_message_at) {
          toast.info(`${tx("Guest reply", "Replica dell'ospite")}${row.room ? ` · ${row.room}` : ""}`, { description: row.category });
          if (soundAllowed.current() && soundEnabled()) playNotice();
        }
        void load();
      })
      .subscribe((status) => {
        // Rows inserted between the first load and the subscription (or during a reconnect) must not be missed.
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") void load();
      });
    // Local changes (take charge / complete) update the lamp immediately, without waiting for realtime.
    const onLocalChange = (event: Event) => {
      const d = (event as CustomEvent<{ from?: string; to?: string }>).detail;
      if (!d?.from) { void load(); return; } // change confirmed by the database: reconcile
      // Optimistic step: the database write is still in flight, so do not reload yet.
      if (d.from === "open" && d.to !== "open") setCount((c) => Math.max(0, c - 1));
      if (d.from !== "open" && d.to === "open") setCount((c) => c + 1);
    };
    window.addEventListener(SERVICE_REQUESTS_CHANGED_EVENT, onLocalChange);
    // Safety net: if the realtime connection silently drops, still catch up quickly.
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 8000);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(poll); window.removeEventListener(SERVICE_REQUESTS_CHANGED_EVENT, onLocalChange); document.removeEventListener("visibilitychange", onVisible); void supabase.removeChannel(channel); };
  }, [botId, enabled]);

  return { count, urgent, enabled };
}
