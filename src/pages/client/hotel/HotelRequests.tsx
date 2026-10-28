import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ConciergeBell, Loader2, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useActiveModule } from "@/hooks/useActiveModule";
import { useLanguage, tx, appLocale } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { notifyServiceRequestsChanged } from "@/hooks/useOpenServiceRequests";
import RequestReply, { type ThreadMessage } from "@/components/hotel/RequestReply";
import { DEFAULT_SERVICE_HOURS, SERVICE_HOURS_CHANGED_EVENT, normalizeServiceHours } from "@/lib/serviceHours";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RequestStatus = "open" | "in_progress" | "done";
type ServiceRequest = { id: string; bot_id: string; client_id: string; room: string; category: string; message: string | null; guest_name: string | null; status: RequestStatus; created_at: string; resolved_at: string | null; staff_reply?: string | null; replied_at?: string | null; last_guest_message_at?: string | null };
const statuses: RequestStatus[] = ["open", "in_progress", "done"];
/** The guest wrote in the thread after the last staff reply (or after the request was created). */
const hasGuestReply = (r: ServiceRequest) => !!r.last_guest_message_at && Date.parse(r.last_guest_message_at) > Date.parse(r.replied_at || r.created_at);

const HotelRequests = ({ botIdOverride }: { botIdOverride?: string } = {}) => {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => tx(en, it);
  const { botId: activeBotId } = useActiveModule();
  const botId = botIdOverride ?? activeBotId;
  const { canUseConciergeRequests, loading: planLoading } = usePlanConfig();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ServiceRequest[]>([]);
  const [thread, setThread] = useState<Record<string, ThreadMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState("all");
  const [tab, setTab] = useState<RequestStatus>("open");
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  const timers = useRef<number[]>([]);
  const [hours, setHours] = useState(DEFAULT_SERVICE_HOURS);
  const [hoursLoaded, setHoursLoaded] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    setHoursLoaded(false);
    setHours(DEFAULT_SERVICE_HOURS);
    if (!botId || !canUseConciergeRequests) return;
    let active = true;
    supabase.from("chatbot_configs").select("hotel_profile").eq("id", botId).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { toast.error(tl("Caricamento orario non riuscito", "Could not load service hours")); return; }
      if (!data) return;
      const profile = data.hotel_profile as { service_hours?: unknown } | null;
      setHours(normalizeServiceHours(profile?.service_hours));
      setHoursLoaded(true);
    });
    return () => { active = false; };
  }, [botId, canUseConciergeRequests]);

  const saveHours = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!botId || !hoursLoaded) return;
    setSavingHours(true);
    try {
      // Read the current JSON before merging so other profile sections are preserved.
      const { data, error } = await supabase.from("chatbot_configs").select("hotel_profile").eq("id", botId).maybeSingle();
      if (error || !data) throw error || new Error("Missing profile");
      const profile = data.hotel_profile && typeof data.hotel_profile === "object" && !Array.isArray(data.hotel_profile) ? data.hotel_profile : {};
      const { error: saveError } = await supabase.from("chatbot_configs").update({ hotel_profile: { ...profile, service_hours: { ...hours } } }).eq("id", botId);
      if (saveError) throw saveError;
      window.dispatchEvent(new Event(SERVICE_HOURS_CHANGED_EVENT));
      toast.success(tl("Orario salvato", "Service hours saved"));
    } catch {
      toast.error(tl("Salvataggio non riuscito", "Save failed"));
    } finally { setSavingHours(false); }
  };

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => { window.clearInterval(id); timers.current.forEach((t) => window.clearTimeout(t)); };
  }, []);

  const load = async () => {
    if (!botId || !canUseConciergeRequests) { setLoading(false); return; }
    const { data } = await supabase.from("service_requests").select("id, bot_id, client_id, room, category, message, guest_name, status, created_at, resolved_at, staff_reply, replied_at, last_guest_message_at")
      .eq("bot_id", botId).order("created_at", { ascending: false });
    setRows((data || []) as ServiceRequest[]);
    // Newest messages first so the row limit can only cut the oldest ones, then grouped per request in reading order.
    const { data: msgs } = await supabase.from("service_request_messages").select("id, request_id, author, body, closes_request, created_at")
      .eq("bot_id", botId).limit(2000).order("created_at", { ascending: false });
    const grouped: Record<string, ThreadMessage[]> = {};
    for (const m of ((msgs || []) as ThreadMessage[]).reverse()) (grouped[m.request_id] ||= []).push(m);
    setThread(grouped);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    if (!botId || !canUseConciergeRequests) return;
    const channel = supabase.channel(`hotel-requests-${botId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, (payload) => {
        const row = payload.new as ServiceRequest;
        setRows((current) => current.some((r) => r.id === row.id) ? current : [row, ...current]);
        setNow(Date.now());
        setHighlighted((cur) => new Set(cur).add(row.id));
        timers.current.push(window.setTimeout(() => setHighlighted((cur) => { const n = new Set(cur); n.delete(row.id); return n; }), 8000));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, (payload) => {
        setRows((current) => current.map((r) => r.id === payload.new.id ? payload.new as ServiceRequest : r));
        // The guest wrote again in the same thread: bring it to the staff's eye like a new request.
        const previous = (payload.old ?? {}) as Partial<ServiceRequest>;
        const row = payload.new as ServiceRequest;
        if (row.last_guest_message_at && row.last_guest_message_at !== previous.last_guest_message_at) {
          setNow(Date.now());
          setHighlighted((cur) => new Set(cur).add(row.id));
          timers.current.push(window.setTimeout(() => setHighlighted((cur) => { const n = new Set(cur); n.delete(row.id); return n; }), 8000));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_request_messages", filter: `bot_id=eq.${botId}` }, (payload) => {
        const m = payload.new as ThreadMessage;
        setThread((cur) => (cur[m.request_id] || []).some((x) => x.id === m.id) ? cur : { ...cur, [m.request_id]: [...(cur[m.request_id] || []), m] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [botId, canUseConciergeRequests]);

  const rooms = useMemo(() => [...new Set(rows.map((r) => r.room))].sort(), [rows]);
  const filtered = room === "all" ? rows : rows.filter((r) => r.room === room);
  const visible = filtered.filter((r) => r.status === tab);

  const changeStatus = async (request: ServiceRequest, status: RequestStatus) => {
    const resolved_at = status === "done" ? new Date().toISOString() : null;
    setRows((current) => current.map((r) => r.id === request.id ? { ...r, status, resolved_at } : r));
    notifyServiceRequestsChanged({ from: request.status, to: status });
    const { error } = await supabase.from("service_requests").update({ status, resolved_at }).eq("id", request.id);
    if (error) {
      // Roll back: the request is still in its previous state.
      setRows((current) => current.map((r) => r.id === request.id ? { ...r, status: request.status, resolved_at: request.resolved_at } : r));
      notifyServiceRequestsChanged({ from: status, to: request.status });
      toast.error(tl("Aggiornamento non riuscito, riprova", "Update failed, please retry"));
      return;
    }
    notifyServiceRequestsChanged();
  };

  if (planLoading || loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!canUseConciergeRequests) return <div className="p-4 md:p-6"><div className="glass rounded-lg p-10 text-center space-y-4"><ConciergeBell className="w-10 h-10 mx-auto text-primary" /><h1 className="text-xl font-semibold">{tl("Disponibile nel piano Pro", "Available on the Pro plan")}</h1><p className="text-sm text-muted-foreground">{tl("Gestisci le richieste degli ospiti in tempo reale.", "Manage guest requests in real time.")}</p><Button onClick={() => navigate("/dashboard/upgrade")}>{tl("Passa a Pro", "Upgrade to Pro")}</Button></div></div>;

  const tabLabel = (s: RequestStatus) => ({ open: tl("Da gestire", "To handle"), in_progress: tl("In corso", "In progress"), done: tl("Completate", "Completed") }[s]);
  const action = { open: { next: "in_progress" as RequestStatus, label: tl("Prendi in carico", "Take charge"), icon: Play }, in_progress: { next: "done" as RequestStatus, label: tl("Segna come fatta", "Mark as done"), icon: CheckCircle2 }, done: { next: "open" as RequestStatus, label: tl("Riapri", "Reopen"), icon: RotateCcw } }[tab];

  return <div className="p-4 md:p-6 space-y-5 animate-fade-in-up">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{tl("Richieste ospiti", "Guest requests")}</h1><p className="text-sm text-muted-foreground">{tl("Aggiornate in tempo reale", "Updated in real time")}</p></div>
      <Select value={room} onValueChange={setRoom}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{tl("Tutte le camere", "All rooms")}</SelectItem>{rooms.map((r) => <SelectItem key={r} value={r}>{tl("Camera", "Room")} {r}</SelectItem>)}</SelectContent></Select>
    </div>
    <form onSubmit={saveHours} className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch checked={hours.enabled} disabled={!hoursLoaded || savingHours} onCheckedChange={(enabled) => setHours((h) => ({ ...h, enabled }))} />
          {tl("Orario di presidio", "Service hours")}
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">{tl("Dalle", "From")}<Input type="time" required value={hours.start} disabled={!hoursLoaded || savingHours} onChange={(e) => setHours((h) => ({ ...h, start: e.target.value }))} className="w-28 h-8" /></label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">{tl("Alle", "Until")}<Input type="time" required value={hours.end} disabled={!hoursLoaded || savingHours} onChange={(e) => setHours((h) => ({ ...h, end: e.target.value }))} className="w-28 h-8" /></label>
        <Button type="submit" size="sm" disabled={!hoursLoaded || savingHours}>{savingHours && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}{tl("Salva", "Save")}</Button>
      </div>
      <p className="text-xs text-muted-foreground">{tl("Fuori orario lampada e suono restano spenti; le richieste restano in elenco e il badge resta visibile.", "Outside service hours the lamp and sound stay off; requests remain listed and the badge stays visible.")}</p>
    </form>
    <div className="flex flex-wrap gap-2" role="tablist">
      {statuses.map((s) => <button key={s} role="tab" aria-selected={tab === s} onClick={() => setTab(s)} className={cn("rounded-full px-4 py-1.5 text-sm font-medium border transition-colors", tab === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}>{tabLabel(s)} ({filtered.filter((r) => r.status === s).length})</button>)}
    </div>
    {visible.length === 0 ? (
      <div className="border border-dashed border-border rounded-lg p-10 text-center"><p className="font-medium">{tl("Nessuna richiesta in questa lista", "No requests in this list")}</p><p className="text-sm text-muted-foreground mt-1">{tl("Quando un ospite scrive dal QR della camera, la richiesta compare qui.", "When a guest writes from the room QR code, the request appears here.")}</p></div>
    ) : (
      <div className="space-y-3">{visible.map((row) => {
        const minutes = Math.max(0, Math.floor((now - Date.parse(row.created_at)) / 60000));
        const waiting = row.status === "open" && minutes >= 10;
        const urgent = /^problema/i.test(row.category.trim());
        const Icon = action.icon;
        return <article key={row.id} className={cn("glass rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 border transition-colors", highlighted.has(row.id) ? "border-primary bg-primary/10" : "border-transparent")}>
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="shrink-0 w-16 rounded-lg bg-secondary text-center py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{tl("camera", "room")}</p><p className="text-lg font-bold text-primary leading-tight break-all">{row.room}</p></div>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold flex flex-wrap items-center gap-2">{row.category}{row.message?.startsWith("[chat]") && <span className="rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-[10px] font-semibold uppercase">{tl("Da chat", "From chat")}</span>}{urgent && <span className="rounded-full bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-semibold uppercase">{tl("Urgente", "Urgent")}</span>}{hasGuestReply(row) && <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-semibold uppercase">{tl("Replica dell'ospite", "Guest reply")}</span>}</p>
              {row.message && <p className="text-sm text-foreground break-words">{row.message.replace(/^\[chat\]\s*/, "")}</p>}
              <p className="text-xs text-muted-foreground">{row.guest_name ? `${row.guest_name} · ` : ""}<span className={cn(waiting && "text-destructive font-medium")}>{timeAgo(minutes, lang)}{waiting ? ` · ${tl("in attesa da un po'", "waiting for a while")}` : ""}</span></p>
              <RequestReply request={row} messages={thread[row.id] || []} onSent={(message, patch) => {
                setThread((cur) => (cur[row.id] || []).some((x) => x.id === message.id) ? cur : { ...cur, [row.id]: [...(cur[row.id] || []), message] });
                setRows((cur) => cur.map((r) => r.id === row.id ? { ...r, ...patch } : r));
                // A reply that closes the request leaves the "to handle" counter at once.
                if (patch.status === "done") notifyServiceRequestsChanged({ from: row.status, to: "done" });
              }} />
            </div>
          </div>
          <Button size="sm" variant={tab === "done" ? "outline" : "default"} className="sm:shrink-0" onClick={() => changeStatus(row, action.next)}><Icon className="w-3.5 h-3.5 mr-1" />{action.label}</Button>
        </article>;
      })}</div>
    )}
  </div>;
};

const timeAgo = (minutes: number, _lang?: string) => {
  const rtf = new Intl.RelativeTimeFormat(appLocale(), { numeric: "auto", style: "short" });
  if (minutes < 1) return rtf.format(0, "minute");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const h = Math.floor(minutes / 60);
  if (h < 24) return rtf.format(-h, "hour");
  return rtf.format(-Math.floor(h / 24), "day");
};

export default HotelRequests;