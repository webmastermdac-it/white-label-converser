import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Bot, User, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BotConfig {
  embed_token: string;
  name: string;
  avatar: string;
  primary_color: string;
  welcome_message: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const ClientChatPreview = () => {
  const { clientId } = useAuth();
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [leadSent, setLeadSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("chatbot_configs")
      .select("embed_token, name, avatar, primary_color, welcome_message")
      .eq("client_id", clientId)
      .single()
      .then(({ data }) => {
        if (data) {
          setConfig(data as BotConfig);
          setMessages([{ role: "assistant", content: data.welcome_message || "Ciao! Come posso aiutarti?" }]);
        }
        setConfigLoading(false);
      });
  }, [clientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !config || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }],
          embed_token: config.embed_token,
          session_token: sessionToken,
          source_url: "dashboard-preview",
        }),
      });

      const data = await res.json();
      const botMsg = data.message || "Errore nella risposta.";
      setMessages((prev) => [...prev, { role: "assistant", content: botMsg }]);

      if (data.trigger_lead_form) {
        setShowLeadForm(true);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Errore di connessione. Riprova." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async () => {
    if (!config || !leadForm.name || !leadForm.email) return;
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/capture-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embed_token: config.embed_token,
          session_token: sessionToken,
          lead: leadForm,
          source_url: "dashboard-preview",
          transcript: messages,
        }),
      });
      setLeadSent(true);
      setShowLeadForm(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "Grazie! Ti contatteremo presto. 🎉" }]);
    } catch {
      // silent
    }
  };

  const reset = () => {
    setMessages(config ? [{ role: "assistant", content: config.welcome_message || "Ciao!" }] : []);
    setShowLeadForm(false);
    setLeadSent(false);
    setLeadForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            Chat Preview
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Testa il tuo chatbot in tempo reale, senza installarlo</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-2 border-border">
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>

      {configLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !config ? (
        <div className="glass rounded-xl p-8 text-center">
          <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessun chatbot configurato.</p>
          <a href="/dashboard/settings" className="text-primary text-sm hover:underline mt-1 inline-block">
            Configura prima il tuo bot →
          </a>
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          {/* Chat header */}
          <div
            className="rounded-t-2xl px-5 py-4 flex items-center gap-3"
            style={{ background: config.primary_color || "hsl(var(--primary))" }}
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
              {config.avatar || "🤖"}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{config.name}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-white/70 text-xs">Online</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-white/60 text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Anteprima
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 glass rounded-none border-x border-border overflow-y-auto p-4 space-y-3 min-h-[400px] max-h-[500px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-2 items-end", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary border border-border"
                  )}
                >
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : (config.avatar ? <span>{config.avatar}</span> : <Bot className="w-3.5 h-3.5" />)}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm border border-border"
                  )}
                  style={msg.role === "user" ? { background: config.primary_color || "hsl(var(--primary))" } : {}}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs flex-shrink-0">
                  {config.avatar || "🤖"}
                </div>
                <div className="bg-secondary border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Lead form */}
            {showLeadForm && !leadSent && (
              <div className="glass border border-primary/30 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">📋 Lascia i tuoi contatti</p>
                <Input
                  placeholder="Nome *"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-secondary border-border text-sm h-9"
                />
                <Input
                  placeholder="Email *"
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                  className="bg-secondary border-border text-sm h-9"
                />
                <Input
                  placeholder="Telefono"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
                  className="bg-secondary border-border text-sm h-9"
                />
                <Input
                  placeholder="Messaggio"
                  value={leadForm.message}
                  onChange={(e) => setLeadForm((f) => ({ ...f, message: e.target.value }))}
                  className="bg-secondary border-border text-sm h-9"
                />
                <Button
                  size="sm"
                  className="w-full gradient-primary text-white border-0"
                  onClick={handleLeadSubmit}
                  disabled={!leadForm.name || !leadForm.email}
                >
                  Invia
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="glass rounded-b-2xl border border-t-0 border-border px-3 py-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Scrivi un messaggio..."
              className="flex-1 bg-secondary border-border text-sm"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="gradient-primary text-white border-0 flex-shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientChatPreview;
