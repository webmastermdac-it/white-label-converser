import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare, Search, Trash2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminClientFilter } from "@/contexts/AdminClientFilterContext";

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
  const { selectedClientId } = useAdminClientFilter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("chat_sessions")
      .select("*, clients(name)")
      .order("started_at", { ascending: false });
    if (selectedClientId !== "all") query = query.eq("client_id", selectedClientId);
    query.then(({ data, error }) => {
      if (error) toast.error(error.message);
      setSessions(
        (data || []).map((s: any) => ({
          ...s,
          messages: Array.isArray(s.messages) ? s.messages : [],
        }))
      );
      setLoading(false);
    });
  }, [selectedClientId]);

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

  const handleDelete = async (session: ChatSession) => {
    if (!confirm("Eliminare definitivamente questa sessione di chat?")) return;
    setDeletingId(session.id);
    const { error } = await supabase.from("chat_sessions").delete().eq("id", session.id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    if (selected?.id === session.id) setSelected(null);
    toast.success("Sessione eliminata");
  };

  const handleSendEmail = async () => {
    if (!selected) return;
    if (!emailTo.trim()) {
      toast.error("Inserisci un indirizzo email");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-chat-transcript", {
      body: { session_id: selected.id, to_email: emailTo.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Invio email fallito");
      return;
    }
    toast.success("Trascrizione inviata");
    setEmailTo("");
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
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => { setSelected(session); setEmailTo(""); }}
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
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={deletingId === session.id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(session); }}
                    >
                      {deletingId === session.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chat Transcript — {selected?.clients?.name || "—"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Source: {selected.source_url || "Direct"}</p>
              <div className="space-y-2">
                {selected.messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun messaggio in questa sessione.</p>
                ) : selected.messages.map((msg: any, i: number) => (
                  <div
                    key={i}
                    className={`text-sm p-3 rounded-xl max-w-[85%] whitespace-pre-wrap ${
                      msg.role === "user" ? "chat-bubble-user ml-auto" : "chat-bubble-bot"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Invia via email</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="destinatario@email.it"
                    className="bg-secondary border-border"
                  />
                  <Button onClick={handleSendEmail} disabled={sending}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  className="w-full mt-2"
                  onClick={() => handleDelete(selected)}
                  disabled={deletingId === selected.id}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Elimina sessione
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChats;
