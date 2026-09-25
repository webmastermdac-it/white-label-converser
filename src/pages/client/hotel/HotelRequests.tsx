import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, CheckCircle2, Clock3, ConciergeBell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveModule } from "@/hooks/useActiveModule";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RequestStatus = "open" | "in_progress" | "done";
type ServiceRequest = { id: string; room: string; category: string; message: string | null; guest_name: string | null; status: RequestStatus; created_at: string; resolved_at: string | null };
const statuses: RequestStatus[] = ["open", "in_progress", "done"];

const HotelRequests = ({ botIdOverride }: { botIdOverride?: string } = {}) => {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => lang === "it" ? it : en;
  const { botId: activeBotId } = useActiveModule();
  const botId = botIdOverride ?? activeBotId;
  const { canUseConciergeRequests, loading: planLoading } = usePlanConfig();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState("all");
  const [mobileStatus, setMobileStatus] = useState<RequestStatus>("open");
  const soundEnabled = useRef(localStorage.getItem("genius-service-request-sound") === "true");
  const [sound, setSound] = useState(soundEnabled.current);

  const load = async () => {
    if (!botId || !canUseConciergeRequests) { setLoading(false); return; }
    const { data } = await supabase.from("service_requests").select("id, room, category, message, guest_name, status, created_at, resolved_at")
      .eq("bot_id", botId).order("created_at", { ascending: false });
    setRows((data || []) as ServiceRequest[]); setLoading(false);
  };

  useEffect(() => {
    void load();
    if (!botId || !canUseConciergeRequests) return;
    const channel = supabase.channel(`hotel-requests-${botId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, (payload) => {
        setRows((current) => [payload.new as ServiceRequest, ...current]);
        if (soundEnabled.current) playNotice();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `bot_id=eq.${botId}` }, (payload) => {
        setRows((current) => current.map((r) => r.id === payload.new.id ? payload.new as ServiceRequest : r));
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [botId, canUseConciergeRequests]);

  const rooms = useMemo(() => [...new Set(rows.map((r) => r.room))].sort(), [rows]);
  const filtered = room === "all" ? rows : rows.filter((r) => r.room === room);
  const recentDone = rows.filter((r) => r.resolved_at && Date.parse(r.resolved_at) >= Date.now() - 7 * 86400000);
  const avgMinutes = recentDone.length ? Math.round(recentDone.reduce((sum, r) => sum + (Date.parse(r.resolved_at || r.created_at) - Date.parse(r.created_at)) / 60000, 0) / recentDone.length) : null;

  const changeStatus = async (request: ServiceRequest, status: RequestStatus) => {
    const resolved_at = status === "done" ? new Date().toISOString() : null;
    setRows((current) => current.map((r) => r.id === request.id ? { ...r, status, resolved_at } : r));
    await supabase.from("service_requests").update({ status, resolved_at }).eq("id", request.id);
  };
  const toggleSound = () => { const next = !sound; setSound(next); soundEnabled.current = next; localStorage.setItem("genius-service-request-sound", String(next)); if (next) playNotice(); };

  if (planLoading || loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!canUseConciergeRequests) return <div className="p-4 md:p-6"><div className="glass rounded-lg p-10 text-center space-y-4"><ConciergeBell className="w-10 h-10 mx-auto text-primary" /><h1 className="text-xl font-semibold">{tl("Disponibile nel piano Pro", "Available on the Pro plan")}</h1><p className="text-sm text-muted-foreground">{tl("Gestisci le richieste degli ospiti in tempo reale.", "Manage guest requests in real time.")}</p><Button onClick={() => navigate("/dashboard/upgrade")}>{tl("Passa a Pro", "Upgrade to Pro")}</Button></div></div>;

  return <div className="p-4 md:p-6 space-y-5 animate-fade-in-up">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{tl("Richieste ospiti", "Guest requests")}</h1><p className="text-sm text-muted-foreground">{tl("Aggiornate in tempo reale", "Updated in real time")}</p></div><Button variant="outline" size="sm" onClick={toggleSound}>{sound ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}{tl("Avviso sonoro", "Sound alert")}: {sound ? "ON" : "OFF"}</Button></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="glass rounded-lg p-4"><p className="text-xs text-muted-foreground">{tl("Aperte", "Open")}</p><p className="text-2xl font-bold text-primary">{rows.filter((r) => r.status === "open").length}</p></div><div className="glass rounded-lg p-4"><p className="text-xs text-muted-foreground">{tl("Tempo medio risoluzione · 7 giorni", "Average resolution · 7 days")}</p><p className="text-2xl font-bold">{avgMinutes === null ? "—" : formatDuration(avgMinutes, lang)}</p></div></div>
    <div className="flex flex-wrap gap-3"><Select value={room} onValueChange={setRoom}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{tl("Tutte le camere", "All rooms")}</SelectItem>{rooms.map((r) => <SelectItem key={r} value={r}>{tl("Camera", "Room")} {r}</SelectItem>)}</SelectContent></Select><div className="md:hidden"><Select value={mobileStatus} onValueChange={(v) => setMobileStatus(v as RequestStatus)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{statusLabel(s, lang)}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="hidden md:grid grid-cols-3 gap-4">{statuses.map((status) => <RequestColumn key={status} status={status} rows={filtered.filter((r) => r.status === status)} lang={lang} onChange={changeStatus} />)}</div>
    <div className="md:hidden"><RequestColumn status={mobileStatus} rows={filtered.filter((r) => r.status === mobileStatus)} lang={lang} onChange={changeStatus} /></div>
  </div>;
};

const RequestColumn = ({ status, rows, lang, onChange }: { status: RequestStatus; rows: ServiceRequest[]; lang: "it" | "en"; onChange: (row: ServiceRequest, status: RequestStatus) => void }) => <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">{statusLabel(status, lang)}</h2><span className="text-xs rounded-full bg-secondary px-2 py-1">{rows.length}</span></div>{rows.length === 0 && <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">{lang === "it" ? "Nessuna richiesta" : "No requests"}</div>}{rows.map((row) => <article key={row.id} className="glass rounded-lg p-4 space-y-3"><div className="flex justify-between gap-2"><div><p className="font-semibold text-primary">{lang === "it" ? "Camera" : "Room"} {row.room}</p><p className="text-sm font-medium">{row.category}</p></div><span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</span></div>{row.message && <p className="text-sm text-foreground">{row.message}</p>}{row.guest_name && <p className="text-xs text-muted-foreground">{row.guest_name}</p>}<div className="flex gap-2">{statuses.filter((s) => s !== status).map((next) => <Button key={next} size="sm" variant={next === "done" ? "default" : "outline"} onClick={() => onChange(row, next)}>{next === "done" && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}{statusLabel(next, lang)}</Button>)}</div></article>)}</section>;

const statusLabel = (status: RequestStatus, lang: "it" | "en") => ({ open: lang === "it" ? "Aperte" : "Open", in_progress: lang === "it" ? "In corso" : "In progress", done: lang === "it" ? "Fatte" : "Done" }[status]);
const formatDuration = (minutes: number, lang: "it" | "en") => minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const playNotice = () => { const AudioCtx = window.AudioContext || (window as any).webkitAudioContext; const ctx = new AudioCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 880; gain.gain.setValueAtTime(0.08, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); osc.start(); osc.stop(ctx.currentTime + 0.25); };

export default HotelRequests;