import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, tx, appLocale } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Download, Search, Filter, Loader2, MessageSquare } from "lucide-react";
import { getLanguageFlag } from "@/lib/languageFlags";
import { useActiveModule } from "@/hooks/useActiveModule";

interface Booking { check_in?: string; check_out?: string; adults?: number; children?: number; room_id?: string | null; room_name?: string | null }
const nightsOf = (b?: Booking | null) => (b?.check_in && b?.check_out ? Math.round((Date.parse(b.check_out) - Date.parse(b.check_in)) / 86400000) : null);
const fmtDay = (iso?: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : "—"; };
const guestsOf = (b?: Booking | null) => (b ? `${b.adults ?? 0}${b.children ? ` + ${b.children}` : ""}` : "—");

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  source_url: string;
  transcript: any[];
  created_at: string;
  language?: string;
  booking?: Booking | null;
  session_id?: string | null;
  bot_id?: string | null;
}

const ClientLeads = () => {
  const { clientId } = useAuth();
  const { t, lang } = useLanguage();
  const tl = (it: string, en: string) => tx(en, it);
  const { module: activeModule } = useActiveModule();
  const isHotel = activeModule.id === "hotel";
  const [monthFilter, setMonthFilter] = useState("all");
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const navigate = useNavigate();
  const [openingChat, setOpeningChat] = useState(false);

  // Opens the full conversation of the lead in the chat history. Older leads have no session link:
  // fall back to the session of the same bot that was active when the lead was created.
  const openFullChat = async (lead: Lead) => {
    setOpeningChat(true);
    let sessionId = lead.session_id || null;
    if (!sessionId && lead.bot_id) {
      const created = new Date(lead.created_at).getTime();
      const { data } = await supabase.from("chat_sessions").select("id, started_at, last_message_at, ended_at")
        .eq("bot_id", lead.bot_id).lte("started_at", lead.created_at)
        .order("started_at", { ascending: false }).limit(5);
      const match = (data || []).find((s: any) => {
        const end = Date.parse(s.ended_at || s.last_message_at || s.started_at);
        return Math.abs(end - created) < 10 * 60 * 1000;
      });
      sessionId = match?.id || null;
    }
    setOpeningChat(false);
    if (!sessionId) { toast({ title: tl("Chat completa non trovata per questo lead", "Full chat not found for this lead"), variant: "destructive" }); return; }
    navigate(`/dashboard/chats?session=${sessionId}`);
  };

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("leads")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLeads((data || []).map((l: any) => ({ ...l, transcript: Array.isArray(l.transcript) ? l.transcript : [] })));
        setLoading(false);
      });
  }, [clientId]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("leads").update({ status }).eq("id", id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  const exportCSV = () => {
    const headers = [t("lead", "Name"), t("email"), t("phone"), t("message"), t("status"), t("source"), t("date")];
    const rows: any[][] = filtered.map((l) => [l.name, l.email, l.phone, l.message, l.status, l.source_url, new Date(l.created_at).toLocaleString()]);
    if (isHotel) {
      headers.push(tl("Arrivo", "Arrival"), tl("Partenza", "Departure"), tl("Notti", "Nights"), tl("Adulti", "Adults"), tl("Bambini", "Children"), tl("Camera", "Room"));
      filtered.forEach((l, i) => rows[i].push(l.booking?.check_in || "", l.booking?.check_out || "", nightsOf(l.booking) ?? "", l.booking?.adults ?? "", l.booking?.children ?? "", l.booking?.room_name || ""));
    }
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "leads.csv"; a.click();
  };

  const filtered = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchMonth = !isHotel || monthFilter === "all" || (l.booking?.check_in || "").slice(0, 7) === monthFilter;
    return matchSearch && matchMonth && (statusFilter === "all" || l.status === statusFilter);
  });

  const arrivalMonths = isHotel
    ? Array.from(new Set(leads.map((l) => (l.booking?.check_in || "").slice(0, 7)).filter(Boolean))).sort()
    : [];
  const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString(appLocale(), { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{t("leads")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{leads.length} {t("totalLeadsCount")}</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="border-border text-muted-foreground hover:text-foreground w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" /> {t("exportCSV")}
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchLeads")} className="pl-9 bg-secondary border-border h-12 text-base md:h-10 md:text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 md:w-36 bg-secondary border-border h-12 md:h-10">
            <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {["all", "new", "contacted", "closed"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s === "all" ? t("allStatus") : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isHotel && (
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-32 md:w-44 bg-secondary border-border h-12 md:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">{tl("Tutti gli arrivi", "All arrivals")}</SelectItem>
              {arrivalMonths.map((m) => <SelectItem key={m} value={m} className="capitalize">{monthLabel(m)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Desktop table */}
      <div className="glass rounded-xl overflow-hidden hidden md:block">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{t("noLeadsFound")}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t("lead")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t("phone")}</th>
                {isHotel && <>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{tl("Arrivo", "Arrival")}</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{tl("Notti", "Nights")}</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{tl("Ospiti", "Guests")}</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{tl("Camera", "Room")}</th>
                </>}
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t("status")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t("date")}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelectedLead(lead)}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground text-sm">
                      <span title={getLanguageFlag(lead.language).tooltip}>{getLanguageFlag(lead.language).flag}</span> {lead.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{lead.phone || "—"}</td>
                  {isHotel && <>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{fmtDay(lead.booking?.check_in)}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{nightsOf(lead.booking) ?? "—"}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{lead.booking ? guestsOf(lead.booking) : "—"}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{lead.booking?.room_name || "—"}</td>
                  </>}
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      lead.status === "new" ? "status-new" : lead.status === "contacted" ? "status-contacted" : "status-closed"
                    }`}>{lead.status}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <Select value={lead.status} onValueChange={(v) => { updateStatus(lead.id, v); }}>
                      <SelectTrigger className="w-28 h-7 text-xs bg-secondary border-border" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {["new", "contacted", "closed"].map((s) => (
                          <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{t("noLeadsFound")}</div>
        ) : (
          filtered.map((lead) => (
            <div key={lead.id} className="glass rounded-xl p-4 space-y-2" onClick={() => setSelectedLead(lead)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" title={getLanguageFlag(lead.language).tooltip}>{getLanguageFlag(lead.language).flag}</span>
                  <p className="font-medium text-foreground text-sm">👤 {lead.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  lead.status === "new" ? "status-new" :
                  lead.status === "contacted" ? "status-contacted" : "status-closed"
                }`}>{lead.status.toUpperCase()}</span>
              </div>
              <p className="text-xs text-muted-foreground">{lead.email}</p>
              {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
              {isHotel && lead.booking?.check_in && (
                <p className="text-xs text-foreground">🛏️ {fmtDay(lead.booking.check_in)} · {nightsOf(lead.booking)} {tl("notti", "nights")} · {guestsOf(lead.booking)} {tl("ospiti", "guests")}{lead.booking.room_name ? ` · ${lead.booking.room_name}` : ""}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">📅 {new Date(lead.created_at).toLocaleString()}</p>
                {lead.transcript && lead.transcript.length > 0 && (
                  <button className="text-xs text-primary hover:underline min-h-[44px] flex items-center">{t("View transcript", "Vedi trascrizione")}</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg w-[95vw] md:w-full max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Lead: {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">{t("lead", "Nome")}</p><p className="text-sm text-foreground mt-1">{selectedLead.name}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("email")}</p><p className="text-sm text-foreground mt-1">{selectedLead.email}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("phone")}</p><p className="text-sm text-foreground mt-1">{selectedLead.phone || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("status")}</p><p className="text-sm text-foreground mt-1 capitalize">{selectedLead.status}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("date")}</p><p className="text-sm text-foreground mt-1">{new Date(selectedLead.created_at).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("source")}</p><p className="text-sm text-foreground mt-1 truncate">{selectedLead.source_url || "—"}</p></div>
                {isHotel && selectedLead.booking?.check_in && (
                  <div className="col-span-1 sm:col-span-2 rounded-lg bg-secondary/40 p-3 text-sm text-foreground">
                    🛏️ {fmtDay(selectedLead.booking.check_in)} → {fmtDay(selectedLead.booking.check_out)} · {nightsOf(selectedLead.booking)} {tl("notti", "nights")} · {guestsOf(selectedLead.booking)} {tl("ospiti", "guests")}{selectedLead.booking.room_name ? ` · ${selectedLead.booking.room_name}` : ""}
                  </div>
                )}
                <div className="col-span-1 sm:col-span-2"><p className="text-xs text-muted-foreground">{t("message")}</p><p className="text-sm text-foreground mt-1">{selectedLead.message || "—"}</p></div>
              </div>
              <Button className="w-full h-11 gap-2" variant="outline" disabled={openingChat} onClick={() => openFullChat(selectedLead)}>
                {openingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}{tl("Apri la chat completa col chatbot", "Open the full chat with the chatbot")}
              </Button>
              {selectedLead.transcript.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t("chatTranscript")}</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-secondary rounded-lg">
                    {selectedLead.transcript.map((msg: any, i: number) => (
                      <div key={i} className={`text-xs p-2 rounded-lg ${msg.role === "user" ? "bg-primary/10 text-foreground ml-4" : "bg-card text-muted-foreground mr-4"}`}>
                        <span className="font-medium capitalize">{msg.role}: </span>{msg.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientLeads;
