import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useActiveModule } from "@/hooks/useActiveModule";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import HotelQrTab from "@/components/hotel/HotelQrTab";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Check, Copy, GripVertical, Loader2, Plus, Trash2, Wand2, ExternalLink, Upload } from "lucide-react";
import {
  normalizeHotelProfile, emptyRoom, emptyService, emptyGuide, buildBookingUrl, uid,
  type HotelProfile as HP,
} from "@/lib/hotelProfile";

type Status = "idle" | "saving" | "saved" | "error";

const HotelProfile = ({ botIdOverride }: { botIdOverride?: string } = {}) => {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => (lang === "it" ? it : en);
  const { clientId } = useAuth();
  const { botId: activeBotId } = useActiveModule();
  const botId = botIdOverride ?? activeBotId;
  const { canUseConciergeRequests } = usePlanConfig();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hp, setHp] = useState<HP | null>(null);
  const [embedToken, setEmbedToken] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number>();
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!botId || loadedFor.current === botId) return;
    loadedFor.current = botId;
    supabase.from("chatbot_configs").select("hotel_profile, site_url, embed_token").eq("id", botId).maybeSingle().then(({ data }) => {
      setHp(normalizeHotelProfile((data as any)?.hotel_profile));
      setSiteUrl((data as any)?.site_url || "");
      setEmbedToken((data as any)?.embed_token || "");
    });
  }, [botId]);

  const persist = async (next: HP) => {
    if (!botId) return;
    setStatus("saving");
    const { error } = await supabase.from("chatbot_configs").update({ hotel_profile: next as any }).eq("id", botId);
    setStatus(error ? "error" : "saved");
    if (error) toast.error(tl("Salvataggio non riuscito", "Save failed"));
  };

  const update = (fn: (d: HP) => HP) => {
    setHp((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => persist(next), 800);
      return next;
    });
  };

  // ── Import from site ──
  const [importing, setImporting] = useState(false);
  const [proposal, setProposal] = useState<HP | null>(null);
  const runImport = async () => {
    if (!botId) return;
    if (!siteUrl) { toast.error(tl("Imposta prima l'URL del sito nelle Impostazioni bot", "Set the site URL in bot settings first")); return; }
    setImporting(true);
    const { data, error } = await supabase.functions.invoke("hotel-profile-import", { body: { bot_id: botId } });
    setImporting(false);
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) { try { const j = await error.context.json(); msg = j.error || msg; if (j.status === 402) msg = tl("Crediti AI esauriti", "AI credits exhausted"); } catch { /* ignore */ } }
      toast.error(tl("Importazione non riuscita: ", "Import failed: ") + msg);
      return;
    }
    setProposal(normalizeHotelProfile(data?.proposal));
  };
  const applyImport = () => {
    if (!proposal || !hp) return;
    const pick = <T,>(a: T, b: T) => (b === "" || b == null || (Array.isArray(b) && !b.length) ? a : b);
    update((d) => ({
      ...d,
      property: Object.fromEntries(Object.entries(d.property).map(([k, v]) => [k, pick(v, (proposal.property as any)[k])])) as HP["property"],
      policies: Object.fromEntries(Object.entries(d.policies).map(([k, v]) => [k, pick(v, (proposal.policies as any)[k])])) as HP["policies"],
      rooms: [...d.rooms, ...proposal.rooms.filter((r) => r.name)],
      services: [...d.services, ...proposal.services.filter((r) => r.name)],
      local_guide: [...d.local_guide, ...proposal.local_guide.filter((r) => r.name)],
    }));
    setProposal(null);
    toast.success(tl("Dati importati", "Data imported"));
  };

  if (!botId || !hp) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const setP = (k: keyof HP["property"], v: any) => update((d) => ({ ...d, property: { ...d.property, [k]: v } }));
  const setPol = (k: keyof HP["policies"], v: string) => update((d) => ({ ...d, policies: { ...d.policies, [k]: v } }));
  const setB = (k: keyof HP["booking"], v: string) => update((d) => ({ ...d, booking: { ...d.booking, [k]: v } }));
  const setR = (k: keyof HP["reviews"], v: string) => update((d) => ({ ...d, reviews: { ...d.reviews, [k]: v } }));

  const hint = <p className="text-xs text-muted-foreground italic">{tl("Se lasci vuoto, il bot non ne parla.", "If left empty, the bot won't mention it.")}</p>;

  const tabs = [
    ["property", tl("Struttura", "Property")], ["rooms", tl("Camere", "Rooms")], ["services", tl("Servizi", "Services")],
    ["policies", "Policy"], ["guide", tl("Guida locale", "Local guide")], ["booking", tl("Prenotazioni", "Bookings")],
    ["reviews", tl("Recensioni", "Reviews")], ["qr", "QR"],
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>{tl("Profilo struttura", "Property profile")}</h1>
        </div>
        <SaveBadge status={status} tl={tl} />
      </div>

      <Tabs value={searchParams.get("tab") || "property"} onValueChange={(tab) => setSearchParams(tab === "property" ? {} : { tab })}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max">
            {tabs.map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
          </TabsList>
        </div>

        <TabsContent value="property" className="space-y-4">
          <Section>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">{tl("Precompila i campi leggendo il tuo sito.", "Prefill fields by reading your website.")}</p>
              <Button variant="outline" size="sm" onClick={runImport} disabled={importing} className="gap-2">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {importing ? tl("Lettura del sito…", "Reading site…") : tl("Importa dal sito", "Import from site")}
              </Button>
            </div>
          </Section>
          <Section>
            <Grid>
              <F label={tl("Nome struttura", "Property name")}><Input value={hp.property.name} onChange={(e) => setP("name", e.target.value)} /></F>
              <F label={tl("Tipologia", "Type")}>
                <Select value={hp.property.type} onValueChange={(v) => setP("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem><SelectItem value="bnb">B&B</SelectItem>
                    <SelectItem value="resort">Resort</SelectItem><SelectItem value="agriturismo">Agriturismo</SelectItem>
                    <SelectItem value="appartamenti">{tl("Appartamenti", "Apartments")}</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label={tl("Stelle", "Stars")}><Input type="number" min={0} max={5} value={hp.property.stars ?? ""} onChange={(e) => setP("stars", e.target.value ? Number(e.target.value) : null)} /></F>
              <F label={tl("Indirizzo", "Address")}><Input value={hp.property.address} onChange={(e) => setP("address", e.target.value)} /></F>
              <F label={tl("Telefono", "Phone")}><Input value={hp.property.phone} onChange={(e) => setP("phone", e.target.value)} /></F>
              <F label="Email"><Input type="email" value={hp.property.email} onChange={(e) => setP("email", e.target.value)} /></F>
              <F label={tl("Check-in dalle", "Check-in from")}><Input type="time" value={hp.property.checkin_from} onChange={(e) => setP("checkin_from", e.target.value)} /></F>
              <F label={tl("Check-in fino alle", "Check-in until")}><Input type="time" value={hp.property.checkin_to} onChange={(e) => setP("checkin_to", e.target.value)} /></F>
              <F label={tl("Check-out entro le", "Check-out by")}><Input type="time" value={hp.property.checkout_until} onChange={(e) => setP("checkout_until", e.target.value)} /></F>
              <F label={tl("Orari reception", "Reception hours")}><Input value={hp.property.reception_hours} onChange={(e) => setP("reception_hours", e.target.value)} placeholder="24h" /></F>
              <F label={tl("Apertura reception (ora italiana)", "Reception opens (Europe/Rome)")}><Input type="time" value={hp.property.reception_open} onChange={(e) => setP("reception_open", e.target.value)} /></F>
              <F label={tl("Chiusura reception (ora italiana)", "Reception closes (Europe/Rome)")}><Input type="time" value={hp.property.reception_close} onChange={(e) => setP("reception_close", e.target.value)} /></F>
              <F label={tl("Lingue parlate (separate da virgola)", "Languages spoken (comma separated)")}>
                <CsvInput value={hp.property.languages} onChange={(v) => setP("languages", v)} placeholder="Italiano, English" />
              </F>
            </Grid>
            {hint}
          </Section>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <CardList
            items={hp.rooms} tl={tl} addLabel={tl("Aggiungi camera", "Add room")}
            onChange={(rooms) => update((d) => ({ ...d, rooms }))} create={emptyRoom}
            render={(r, set) => (
              <Grid>
                <F label={tl("Nome camera", "Room name")}><Input value={r.name} onChange={(e) => set({ name: e.target.value })} /></F>
                <F label={tl("Letti", "Beds")}><Input value={r.beds} onChange={(e) => set({ beds: e.target.value })} placeholder={tl("1 matrimoniale", "1 double")} /></F>
                <F label={tl("Adulti max", "Max adults")}><NumInput value={r.max_adults} onChange={(v) => set({ max_adults: v })} /></F>
                <F label={tl("Bambini max", "Max children")}><NumInput value={r.max_children} onChange={(v) => set({ max_children: v })} /></F>
                <F label="m²"><NumInput value={r.size_m2} onChange={(v) => set({ size_m2: v })} /></F>
                <F label={tl("Prezzo da (€)", "Price from (€)")}><NumInput value={r.price_from} onChange={(v) => set({ price_from: v })} /></F>
                <F label={tl("Dotazioni (separate da virgola)", "Amenities (comma separated)")} full>
                  <CsvInput value={r.amenities} onChange={(v) => set({ amenities: v })} placeholder="Wi-Fi, A/C, TV" />
                </F>
                <F label={tl("Descrizione", "Description")} full><Textarea rows={2} value={r.description} onChange={(e) => set({ description: e.target.value })} /></F>
                <F label={tl("Immagine", "Image")} full><ImageField value={r.image_url} onChange={(v) => set({ image_url: v })} clientId={clientId} tl={tl} /></F>
              </Grid>
            )}
          />
          {hint}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <CardList
            items={hp.services} tl={tl} addLabel={tl("Aggiungi servizio", "Add service")}
            onChange={(services) => update((d) => ({ ...d, services }))} create={emptyService}
            render={(r, set) => (
              <Grid>
                <F label={tl("Nome servizio", "Service name")}><Input value={r.name} onChange={(e) => set({ name: e.target.value })} /></F>
                <F label={tl("Orari", "Hours")}><Input value={r.hours} onChange={(e) => set({ hours: e.target.value })} /></F>
                <F label={tl("Prezzo", "Price")}><Input value={r.price} disabled={r.included} onChange={(e) => set({ price: e.target.value })} /></F>
                <div className="flex items-center gap-2 pt-6"><Switch checked={r.included} onCheckedChange={(v) => set({ included: v })} /><Label>{tl("Incluso nel prezzo", "Included in price")}</Label></div>
                <F label={tl("Descrizione", "Description")} full><Textarea rows={2} value={r.description} onChange={(e) => set({ description: e.target.value })} /></F>
              </Grid>
            )}
          />
          {hint}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Section>
            <Grid>
              {([
                ["cancellation", tl("Cancellazione", "Cancellation")], ["children", tl("Bambini", "Children")],
                ["pets", tl("Animali", "Pets")], ["late_checkout", "Late check-out"], ["early_checkin", "Early check-in"],
                ["city_tax", tl("Tassa di soggiorno", "City tax")], ["payment_methods", tl("Metodi di pagamento", "Payment methods")],
                ["parking", tl("Parcheggio", "Parking")],
              ] as [keyof HP["policies"], string][]).map(([k, l]) => (
                <F key={k} label={l}><Textarea rows={2} value={hp.policies[k]} onChange={(e) => setPol(k, e.target.value)} /></F>
              ))}
            </Grid>
            {hint}
          </Section>
        </TabsContent>

        <TabsContent value="guide" className="space-y-4">
          <CardList
            items={hp.local_guide} tl={tl} addLabel={tl("Aggiungi luogo", "Add place")}
            onChange={(local_guide) => update((d) => ({ ...d, local_guide }))} create={emptyGuide}
            render={(r, set) => (
              <Grid>
                <F label={tl("Nome", "Name")}><Input value={r.name} onChange={(e) => set({ name: e.target.value })} /></F>
                <F label={tl("Categoria", "Category")}>
                  <Select value={r.category} onValueChange={(v) => set({ category: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ristorante">{tl("Ristorante", "Restaurant")}</SelectItem>
                      <SelectItem value="attrazione">{tl("Attrazione", "Attraction")}</SelectItem>
                      <SelectItem value="trasporti">{tl("Trasporti", "Transport")}</SelectItem>
                      <SelectItem value="spiaggia">{tl("Spiaggia", "Beach")}</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="altro">{tl("Altro", "Other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label={tl("Distanza", "Distance")}><Input value={r.distance} onChange={(e) => set({ distance: e.target.value })} placeholder="5 min a piedi" /></F>
                <F label="Link"><Input value={r.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" /></F>
                <F label={tl("Descrizione", "Description")} full><Textarea rows={2} value={r.description} onChange={(e) => set({ description: e.target.value })} /></F>
              </Grid>
            )}
          />
          {hint}
        </TabsContent>

        <TabsContent value="booking" className="space-y-4">
          <BookingTab hp={hp} setB={setB} tl={tl} />
          {hint}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <Section>
            <Grid>
              <F label="Google" full><Input value={hp.reviews.google_url} onChange={(e) => setR("google_url", e.target.value)} placeholder="https://" /></F>
              <F label="Booking.com" full><Input value={hp.reviews.booking_url} onChange={(e) => setR("booking_url", e.target.value)} placeholder="https://" /></F>
              <F label="Tripadvisor" full><Input value={hp.reviews.tripadvisor_url} onChange={(e) => setR("tripadvisor_url", e.target.value)} placeholder="https://" /></F>
            </Grid>
            {hint}
          </Section>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <HotelQrTab
            profile={hp}
            embedToken={embedToken}
            enabled={canUseConciergeRequests}
            onChange={(next) => update(() => next)}
            onDownloaded={() => update((d) => ({ ...d, qr_downloaded_at: d.qr_downloaded_at || new Date().toISOString() }))}
            onUpgrade={() => navigate("/dashboard/upgrade")}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!proposal} onOpenChange={(o) => !o && setProposal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tl("Anteprima dati trovati sul sito", "Preview of data found on the site")}</DialogTitle></DialogHeader>
          {proposal && <ImportPreview p={proposal} tl={tl} />}
          <p className="text-xs text-muted-foreground">{tl("I campi già compilati non vengono sovrascritti se il sito non riporta quel dato. Camere, servizi e luoghi vengono aggiunti a quelli esistenti.", "Filled fields are kept when the site has no value. Rooms, services and places are added to the existing ones.")}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProposal(null)}>{tl("Annulla", "Cancel")}</Button>
            <Button onClick={applyImport}>{tl("Conferma e salva", "Confirm and save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── helpers ──

const Section = ({ children }: { children: ReactNode }) => <div className="glass rounded-xl p-4 md:p-5 space-y-4">{children}</div>;
const Grid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
const F = ({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) => (
  <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}><Label className="text-sm">{label}</Label>{children}</div>
);

const NumInput = ({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) => (
  <Input type="number" min={0} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
);

const CsvInput = ({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) => {
  const [text, setText] = useState(value.join(", "));
  useEffect(() => { if (value.join(", ") !== text.split(",").map((s) => s.trim()).filter(Boolean).join(", ")) setText(value.join(", ")); }, [value]); // eslint-disable-line
  return <Input value={text} placeholder={placeholder} onChange={(e) => { setText(e.target.value); onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean)); }} />;
};

const SaveBadge = ({ status, tl }: { status: Status; tl: (a: string, b: string) => string }) => {
  if (status === "idle") return null;
  if (status === "saving") return <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{tl("Salvataggio…", "Saving…")}</span>;
  if (status === "error") return <span className="text-xs text-destructive">{tl("Errore di salvataggio", "Save error")}</span>;
  return <span className="text-xs text-primary flex items-center gap-1"><Check className="w-3 h-3" />{tl("Salvato", "Saved")} ✓</span>;
};

function CardList<T extends { id: string; name: string }>({ items, onChange, create, render, addLabel, tl }: {
  items: T[]; onChange: (v: T[]) => void; create: () => T; addLabel: string;
  render: (item: T, set: (patch: Partial<T>) => void) => ReactNode; tl: (a: string, b: string) => string;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items]; const [x] = next.splice(from, 1); next.splice(to, 0, x); onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`glass rounded-xl p-4 space-y-3 ${dragIdx === i ? "opacity-50" : ""}`}
          onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) { move(dragIdx, i); setDragIdx(i); } }}
          onDrop={() => setDragIdx(null)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span draggable onDragStart={() => setDragIdx(i)} onDragEnd={() => setDragIdx(null)} className="cursor-grab text-muted-foreground" title={tl("Trascina per riordinare", "Drag to reorder")}>
                <GripVertical className="w-4 h-4" />
              </span>
              <span className="font-medium text-foreground truncate">{item.name || tl("Senza nome", "Untitled")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" title={tl("Duplica", "Duplicate")} onClick={() => { const n = [...items]; n.splice(i + 1, 0, { ...item, id: uid(), name: item.name ? `${item.name} (copia)` : "" }); onChange(n); }}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" title={tl("Elimina", "Delete")} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
          {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <Button variant="outline" className="w-full gap-2" onClick={() => onChange([...items, create()])}><Plus className="w-4 h-4" />{addLabel}</Button>
    </div>
  );
}

const ImageField = ({ value, onChange, clientId, tl }: { value: string; onChange: (v: string) => void; clientId: string | null; tl: (a: string, b: string) => string }) => {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    if (!clientId) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(tl("Immagine troppo grande (max 5 MB)", "Image too large (max 5 MB)")); return; }
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `hotel/${clientId}/${uid()}.${ext}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file);
    setBusy(false);
    if (error) { toast.error(tl("Caricamento non riuscito", "Upload failed")); return; }
    onChange(supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl);
  };
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
      {value && <img src={value} alt="" className="w-20 h-14 object-cover rounded-md border border-border" />}
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" className="flex-1" />
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{tl("Carica", "Upload")}
      </Button>
    </div>
  );
};

const BookingTab = ({ hp, setB, tl }: { hp: HP; setB: (k: keyof HP["booking"], v: string) => void; tl: (a: string, b: string) => string }) => {
  const ci = new Date(); ci.setDate(ci.getDate() + 14);
  const co = new Date(ci); co.setDate(co.getDate() + 3);
  const preview = hp.booking.engine_url_template ? buildBookingUrl(hp.booking.engine_url_template, hp.booking.date_format, ci, co, 2, 1) : "";
  return (
    <Section>
      <Grid>
        <F label={tl("Link del booking engine", "Booking engine link")} full>
          <Input value={hp.booking.engine_url_template} onChange={(e) => setB("engine_url_template", e.target.value)} placeholder="https://booking.esempio.it/?arrivo={checkin}&partenza={checkout}&adulti={adults}&bambini={children}" />
          <p className="text-xs text-muted-foreground">{tl("Segnaposto disponibili:", "Available placeholders:")} <code>{"{checkin}"}</code> <code>{"{checkout}"}</code> <code>{"{adults}"}</code> <code>{"{children}"}</code></p>
        </F>
        <F label={tl("Formato date", "Date format")}>
          <Select value={hp.booking.date_format} onValueChange={(v) => setB("date_format", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem><SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem></SelectContent>
          </Select>
        </F>
        <div />
        <F label={tl("Telefono prenotazioni", "Booking phone")}><Input value={hp.booking.phone_booking} onChange={(e) => setB("phone_booking", e.target.value)} /></F>
        <F label={tl("Email prenotazioni", "Booking email")}><Input type="email" value={hp.booking.email_booking} onChange={(e) => setB("email_booking", e.target.value)} /></F>
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

const ImportPreview = ({ p, tl }: { p: HP; tl: (a: string, b: string) => string }) => {
  const rows = Object.entries(p.property).filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length));
  const pol = Object.entries(p.policies).filter(([, v]) => v);
  const empty = !rows.length && !pol.length && !p.rooms.length && !p.services.length && !p.local_guide.length;
  if (empty) return <p className="text-sm text-muted-foreground">{tl("Nessun dato trovato sul sito.", "No data found on the site.")}</p>;
  return (
    <div className="space-y-3 text-sm">
      {rows.length > 0 && <div><p className="font-medium mb-1">{tl("Struttura", "Property")}</p>{rows.map(([k, v]) => <p key={k} className="text-muted-foreground"><span className="text-foreground">{k}:</span> {Array.isArray(v) ? v.join(", ") : String(v)}</p>)}</div>}
      {p.rooms.length > 0 && <div><p className="font-medium mb-1">{tl("Camere", "Rooms")} ({p.rooms.length})</p><p className="text-muted-foreground">{p.rooms.map((r) => r.name).join(" · ")}</p></div>}
      {p.services.length > 0 && <div><p className="font-medium mb-1">{tl("Servizi", "Services")} ({p.services.length})</p><p className="text-muted-foreground">{p.services.map((r) => r.name).join(" · ")}</p></div>}
      {pol.length > 0 && <div><p className="font-medium mb-1">Policy</p>{pol.map(([k, v]) => <p key={k} className="text-muted-foreground"><span className="text-foreground">{k}:</span> {v}</p>)}</div>}
      {p.local_guide.length > 0 && <div><p className="font-medium mb-1">{tl("Guida locale", "Local guide")} ({p.local_guide.length})</p><p className="text-muted-foreground">{p.local_guide.map((r) => r.name).join(" · ")}</p></div>}
    </div>
  );
};

export default HotelProfile;
