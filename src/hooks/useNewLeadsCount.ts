import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const LEADS_CHANGED_EVENT = "genius-leads-changed";
export const notifyLeadsChanged = () => window.dispatchEvent(new Event(LEADS_CHANGED_EVENT));

/** Leads still to handle (status "new"), live: drives the coloured badge on "Lead" in the menu. */
export function useNewLeadsCount() {
  const { clientId } = useAuth();
  const [count, setCount] = useState(0);
  const [stay, setStay] = useState(0);

  useEffect(() => {
    setCount(0); setStay(0);
    if (!clientId) return;
    let active = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      const { data, error } = await supabase.from("leads").select("id, source, booking").eq("client_id", clientId).eq("status", "new").limit(1000);
      if (!active || current !== revision || error) return;
      const rows = (data || []) as { source?: string | null; booking?: { check_in?: string } | null }[];
      setCount(rows.length);
      setStay(rows.filter((r) => r.source === "hotel_quote" || !!r.booking?.check_in).length);
    };
    void load();
    const channel = supabase.channel(`leads-count-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads", filter: `client_id=eq.${clientId}` }, () => { void load(); })
      .subscribe((status) => { if (status === "SUBSCRIBED") void load(); });
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    const onLocal = () => { void load(); };
    window.addEventListener(LEADS_CHANGED_EVENT, onLocal);
    return () => { active = false; window.clearInterval(poll); window.removeEventListener(LEADS_CHANGED_EVENT, onLocal); void supabase.removeChannel(channel); };
  }, [clientId]);

  return { count, stay };
}
