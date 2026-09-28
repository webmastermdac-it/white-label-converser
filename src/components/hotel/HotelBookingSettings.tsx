import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { normalizeHotelProfile, buildBookingUrl, type HotelProfile as HP } from "@/lib/hotelProfile";

type Booking = HP["booking"];
type Status = "idle" | "saving" | "saved" | "error";

const Section = ({ children }: { children: ReactNode }) => <div className="glass rounded-xl p-4 md:p-5 space-y-4">{children}</div>;
const Grid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
const F = ({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) => (
  <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}><Label className="text-sm">{label}</Label>{children}</div>
);

export const BookingTab = ({ booking, setB, tl }: { booking: Booking; setB: (k: keyof Booking, v: string) => void; tl: (a: string, b: string) => string }) => {
  const ci = new Date(); ci.setDate(ci.getDate() + 14);
  const co = new Date(ci); co.setDate(co.getDate() + 3);
  const preview = booking.engine_url_template ? buildBookingUrl(booking.engine_url_template, booking.date_format, ci, co, 2, 1) : "";
  return (
    <Section>
      <Grid>
        <F label={tl("Link del booking engine", "Booking engine link")} full>
          <Input value={booking.engine_url_template} onChange={(e) => setB("engine_url_template", e.target.value)} placeholder="https://booking.esempio.it/?arrivo={checkin}&partenza={checkout}&adulti={adults}&bambini={children}" />
          <p className="text-xs text-muted-foreground">{tl("Segnaposto disponibili:", "Available placeholders:")} <code>{"{checkin}"}</code> <code>{"{checkout}"}</code> <code>{"{adults}"}</code> <code>{"{children}"}</code></p>
        </F>
        <F label={tl("Formato date", "Date format")}>
          <Select value={booking.date_format} onValueChange={(v) => setB("date_format", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem><SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem></SelectContent>
          </Select>
        </F>
        <div />
        <F label={tl("Telefono prenotazioni", "Booking phone")}><Input value={booking.phone_booking} onChange={(e) => setB("phone_booking", e.target.value)} /></F>
        <F label={tl("Email prenotazioni", "Booking email")}><Input type="email" value={booking.email_booking} onChange={(e) => setB("email_booking", e.target.value)} /></F>
      </Grid>
      {preview && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">{tl("Anteprima con date di esempio (2 adulti, 1 bambino, 3 notti):", "Preview with sample dates (2 adults, 1 child, 3 nights):")}</p>
          <p className="text-sm break-all text-foreground">{preview}</p>
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <a href={preview} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" />{tl("Prova link", "Test link")}</a>
          </Button>
        </div>
      )}
    </Section>
  );
};

/** Booking engine settings for a hotel bot; autosaves only hotel_profile.booking */
const HotelBookingSettings = ({ botId, onSaved }: { botId: string | null; onSaved?: (b: Booking) => void }) => {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => (lang === "it" ? it : en);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number>();

  useEffect(() => {
    if (!botId) return;
    setBooking(null);
    supabase.from("chatbot_configs").select("hotel_profile").eq("id", botId).maybeSingle().then(({ data }) => {
      setBooking(normalizeHotelProfile((data as any)?.hotel_profile).booking);
    });
    return () => window.clearTimeout(timer.current);
  }, [botId]);

  const persist = async (next: Booking) => {
    if (!botId) return;
    // Re-read current profile so other keys are never overwritten
    const { data, error: readErr } = await supabase.from("chatbot_configs").select("hotel_profile").eq("id", botId).maybeSingle();
    if (readErr) { setStatus("error"); toast.error(tl("Salvataggio non riuscito", "Save failed")); return; }
    const current = ((data as any)?.hotel_profile && typeof (data as any).hotel_profile === "object") ? (data as any).hotel_profile : {};
    const { error } = await supabase.from("chatbot_configs").update({ hotel_profile: { ...current, booking: next } as any }).eq("id", botId);
    setStatus(error ? "error" : "saved");
    if (error) toast.error(tl("Salvataggio non riuscito", "Save failed"));
    else onSaved?.(next);
  };

  const setB = (k: keyof Booking, v: string) => {
    setBooking((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [k]: v } as Booking;
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => persist(next), 800);
      return next;
    });
  };

  if (!botId || !booking) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end min-h-[1rem]">
        {status === "saving" && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{tl("Salvataggio…", "Saving…")}</span>}
        {status === "error" && <span className="text-xs text-destructive">{tl("Errore di salvataggio", "Save error")}</span>}
        {status === "saved" && <span className="text-xs text-primary flex items-center gap-1"><Check className="w-3 h-3" />{tl("Salvato", "Saved")} ✓</span>}
      </div>
      <BookingTab booking={booking} setB={setB} tl={tl} />
      <p className="text-xs text-muted-foreground italic">{tl("Se lasci vuoto, il bot non ne parla.", "If left empty, the bot won't mention it.")}</p>
    </div>
  );
};

export default HotelBookingSettings;
