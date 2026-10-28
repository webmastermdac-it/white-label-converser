import { useEffect, useState } from "react";
import ChatMessageText from "@/components/chat/ChatMessageText";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, tx } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { chatDurationMinutes, formatChatDuration } from "@/lib/chatDuration";

interface ChatSession {
  id: string;
  messages: any[];
  session_token: string;
  source_url: string;
  started_at: string;
  ended_at: string | null;
  bot_id?: string | null;
  summary?: string | null;
}

interface LeadRef { id: string; name: string; email: string; session_id: string | null; bot_id: string | null; created_at: string }

/** One-line description of a chat: stored AI summary, otherwise the guest's first question. */
const chatSummary = (s: ChatSession, noTopic: string) => {
  if (s.summary && s.summary.trim()) return s.summary.trim();
  const first = s.messages.find((m: any) => m?.role === "user" && typeof m.content === "string" && m.content.trim());
  if (!first) return noTopic;
  const text = String(first.content).replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
};

const ClientChats = () => {
  const { clientId } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [leads, setLeads] = useState<LeadRef[]>([]);
  const tl = (it: string, en: string) => tx(en, it);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSession = searchParams.get("session");

  useEffect(() => {
    if (!clientId) return;
    supabase.from("leads").select("id, name, email, session_id, bot_id, created_at").eq("client_id", clientId)
      .then(({ data }) => setLeads((data || []) as LeadRef[]));
    supabase
      .from("chat_sessions")
      .select("*")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        setSessions((data || []).map((s: any) => ({ ...s, messages: Array.isArray(s.messages) ? s.messages : [] })));
        setLoading(false);
      });
  }, [clientId]);

  // Deep link from a lead: open that conversation directly
  useEffect(() => {
    if (!requestedSession) return;
    const found = sessions.find((s) => s.id === requestedSession);
    if (found) setSelected(found);
  }, [requestedSession, sessions]);

  // Lead of a chat: direct link, otherwise (older leads) same bot and lead created when the chat ended
  const leadOf = (s: ChatSession): LeadRef | undefined => {
    const direct = leads.find((l) => l.session_id === s.id);
    if (direct) return direct;
    const end = Date.parse(s.ended_at || s.started_at);
    return leads.find((l) => !l.session_id && l.bot_id && l.bot_id === s.bot_id && Math.abs(Date.parse(l.created_at) - end) < 10 * 60 * 1000);
  };
  const noTopic = tl("Conversazione senza domande", "Conversation without questions");
  const filtered = sessions.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const lead = leadOf(s);
    return [chatSummary(s, noTopic), lead?.name, lead?.email].some((v) => (v || "").toLowerCase().includes(q));
  });

  const duration = (s: ChatSession) => {
    if (!s.ended_at) return t("active");
    return formatChatDuration(chatDurationMinutes(s.started_at, s.ended_at));
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{t("chatHistory")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{sessions.length} {t("conversationsRecorded")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tl("Cerca per riassunto, nome o email", "Search by summary, name or email")} className="pl-9 bg-secondary border-border" />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("noSessionsYet")}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{tl("Chat", "Chat")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">{t("messages")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">{t("duration")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t("date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((session) => (
                <tr key={session.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelected(session)}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-foreground line-clamp-2 max-w-md">{chatSummary(session, noTopic)}</p>
                    {(() => { const lead = leadOf(session); return lead ? <p className="text-xs text-primary mt-0.5 truncate max-w-md">👤 {lead.name}{lead.email ? ` · ${lead.email}` : ""}</p> : null; })()}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">{session.messages.length}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">{duration(session)}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">{new Date(session.started_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); if (requestedSession) setSearchParams((p) => { const n = new URLSearchParams(p); n.delete("session"); return n; }, { replace: true }); }}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[70vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{t("chatTranscript")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 pt-2 min-w-0">
              <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{chatSummary(selected, noTopic)}</p>
              {(() => { const lead = leadOf(selected); return lead ? <p className="text-xs text-primary">👤 {lead.name}{lead.email ? ` · ${lead.email}` : ""}</p> : null; })()}
              <div className="flex flex-col gap-2 min-w-0">
                {selected.messages.map((msg: any, i: number) => (
                  <div key={i} className={`text-sm p-3 rounded-xl max-w-[85%] min-w-0 w-fit ${
                    msg.role === "user" ? "chat-bubble-user self-end" : "chat-bubble-bot self-start"
                  }`}>
                    <ChatMessageText content={msg.content} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientChats;
