import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatSession {
  id: string;
  messages: any[];
  session_token: string;
  source_url: string;
  started_at: string;
  ended_at: string | null;
}

const ClientChats = () => {
  const { clientId } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSession = searchParams.get("session");

  useEffect(() => {
    if (!clientId) return;
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

  const filtered = sessions.filter((s) =>
    s.source_url.toLowerCase().includes(search.toLowerCase())
  );

  const duration = (s: ChatSession) => {
    if (!s.ended_at) return t("active");
    const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
    const mins = Math.floor(ms / 60000);
    return mins < 1 ? "< 1 min" : `${mins} min`;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{t("chatHistory")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{sessions.length} {t("conversationsRecorded")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchBySource")} className="pl-9 bg-secondary border-border" />
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
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t("session")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">{t("messages")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">{t("duration")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t("date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((session) => (
                <tr key={session.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelected(session)}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-foreground truncate max-w-xs">{session.source_url || "Direct"}</p>
                    <p className="text-xs text-muted-foreground">{session.session_token.slice(0, 8)}...</p>
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
        <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("chatTranscript")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">{t("source")}: {selected.source_url || "Direct"}</p>
              <div className="space-y-2">
                {selected.messages.map((msg: any, i: number) => (
                  <div key={i} className={`text-sm p-3 rounded-xl max-w-[85%] ${
                    msg.role === "user" ? "chat-bubble-user ml-auto" : "chat-bubble-bot"
                  }`}>
                    {msg.content}
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
