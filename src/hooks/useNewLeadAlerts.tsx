import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BedDouble, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tx } from "@/hooks/useLanguage";
import { playNotice, soundEnabled } from "@/lib/playNotice";
import { isStayRequest, stayLine, type Booking } from "@/lib/leadStay";
import LeadReplyButtons from "@/components/leads/LeadReplyButtons";
import { Button } from "@/components/ui/button";

type LeadRow = { id?: string; name?: string; email?: string; phone?: string; message?: string; language?: string; source?: string | null; booking?: Booking | null };

/** A stay request is new when the row arrives with stay data, or when stay data is added/re-sent on an existing lead. */
export function isNewStayEvent(next: LeadRow, prev?: LeadRow | null): boolean {
  if (!next.booking?.check_in) return false;
  if (!prev?.booking?.check_in) return true;
  return Number(next.booking.sends || 0) > Number(prev.booking.sends || 0);
}

export function LeadToast({ id, lead, stay, onOpen }: { id: string | number; lead: LeadRow; stay: boolean; onOpen: () => void }) {
  const Icon = stay ? BedDouble : UserPlus;
  return (
    <div role="status" className={`w-[min(92vw,380px)] rounded-xl border bg-card text-foreground shadow-lg p-4 space-y-3 ${stay ? "border-amber-500 ring-2 ring-amber-500/40" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 rounded-full p-2 ${stay ? "bg-amber-500/20 text-amber-500" : "bg-primary/15 text-primary"}`}><Icon className="w-4 h-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{stay ? tx("New stay request", "Nuova richiesta di soggiorno") : tx("New lead", "Nuovo lead")}: {lead.name || tx("contact", "contatto")}</p>
          <p className="text-xs text-muted-foreground mt-0.5 [overflow-wrap:anywhere]">
            {stay && lead.booking ? stayLine(lead.booking) : (lead.message ? String(lead.message).slice(0, 120) : tx("A visitor left their contact details in the chat.", "Un cliente ha lasciato i suoi contatti nella chat."))}
          </p>
        </div>
        <button type="button" aria-label={tx("Close", "Chiudi")} className="text-muted-foreground hover:text-foreground" onClick={() => toast.dismiss(id)}><X className="w-4 h-4" /></button>
      </div>
      <LeadReplyButtons lead={lead} size="sm" onAction={() => toast.dismiss(id)} />
      <Button size="sm" variant="ghost" className="h-8 w-full text-xs" onClick={() => { toast.dismiss(id); onOpen(); }}>{tx("Open lead", "Apri il lead")}</Button>
    </div>
  );
}

/** Tells the property owner, live, about new leads and new stay requests (alert + sound, with reply by email or phone). */
export function useNewLeadAlerts() {
  const { clientId } = useAuth();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!clientId) return;
    const notify = (lead: LeadRow, stay: boolean) => {
      toast.custom((id) => <LeadToast id={id} lead={lead} stay={stay} onOpen={() => navigateRef.current(`/dashboard/leads${lead.id ? `?lead=${lead.id}` : ""}`)} />, { id: `lead-${lead.id ?? Date.now()}-${stay ? "stay" : "new"}`, duration: Infinity, dismissible: false });
      if (soundEnabled()) { playNotice(); if (stay) window.setTimeout(() => playNotice(), 1100); }
    };
    const channel = supabase.channel(`new-leads-${clientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads", filter: `client_id=eq.${clientId}` }, (payload) => {
        const lead = (payload.new ?? {}) as LeadRow;
        notify(lead, isStayRequest(lead));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `client_id=eq.${clientId}` }, (payload) => {
        const next = (payload.new ?? {}) as LeadRow;
        if (isNewStayEvent(next, (payload.old ?? null) as LeadRow | null)) notify(next, true);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [clientId]);
}
