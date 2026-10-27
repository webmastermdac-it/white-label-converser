import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/hooks/useLanguage";
import { playNotice, soundEnabled } from "@/lib/playNotice";

/** Tells the property owner, live, when a new lead arrives (toast + sound, click opens the leads list). */
export function useNewLeadAlerts() {
  const { clientId } = useAuth();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!clientId) return;
    const channel = supabase.channel(`new-leads-${clientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads", filter: `client_id=eq.${clientId}` }, (payload) => {
        const lead = payload.new as { name?: string; message?: string };
        toast.success(`${tx("New lead", "Nuovo lead")}: ${lead?.name || tx("contact", "contatto")}`, {
          description: lead?.message ? String(lead.message).slice(0, 120) : tx("A visitor left their contact details in the chat.", "Un cliente ha lasciato i suoi contatti nella chat."),
          duration: 15000,
          action: { label: tx("Open", "Apri"), onClick: () => navigateRef.current("/dashboard/leads") },
        });
        if (soundEnabled()) playNotice();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [clientId]);
}
