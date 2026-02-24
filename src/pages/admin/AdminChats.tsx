import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatSession {
  id: string;
  messages: any[];
  session_token: string;
  source_url: string;
  started_at: string;
  ended_at: string | null;
  client_id: string;
  clients?: { name: string };
}

const AdminChats = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ChatSession | null>(null);

  useEffect(() => {
    supabase
      .from("chat_sessions")
      .select("*, clients(name)")
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        setSessions(
          (data || []).map((s: any) => ({
            ...s,
            messages: Array.isArray(s.messages) ? s.messages : [],
          }))
        );
        setLoading(false);
      });
  }, []);

  const filtered = sessions.filter((s) =>
    (s.source_url || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.clients?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const duration = (s: ChatSession) => {
    if (!s.ended_at) return "Active";
    const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
    const mins = Math.floor(ms / 60000);
    return mins < 1 ? "< 1 min" : `${mins} min`;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
          Chat Sessions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{sessions.length} conversations recorded</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client or source URL..."
          className="pl-9 bg-secondary border-border"
        />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No chat sessions yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Session</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Messages</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Duration</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => setSelected(session)}
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-foreground">{session.clients?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{session.source_url || "Direct"}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground hidden md:table-cell">
                    {session.session_token.slice(0, 8)}...
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">
                    {session.messages.length}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">
                    {duration(session)}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {new Date(session.started_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in-0 duration-200" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-[95vw] max-w-lg bg-card border border-border rounded-xl p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-foreground mb-4">Chat Transcript — {selected.clients?.name}</h2>
            <p className="text-xs text-muted-foreground mb-3">Source: {selected.source_url || "Direct"}</p>
            <div className="space-y-2">
              {selected.messages.map((msg: any, i: number) => (
                <div
                  key={i}
                  className={`text-sm p-3 rounded-xl max-w-[85%] ${
                    msg.role === "user" ? "chat-bubble-user ml-auto" : "chat-bubble-bot"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChats;
