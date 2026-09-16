import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useWidgetUrl } from "@/hooks/useWidgetUrl";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import ChatbotConfigForm from "@/components/ChatbotConfigForm";
import ClientRAGKnowledgeBase from "@/pages/client/ClientRAGKnowledgeBase";
import ClientIntegrations from "@/pages/client/ClientIntegrations";
import {
  Loader2, ArrowLeft, Settings, Palette, Database,
  Copy, Code2, Globe, Save, Inbox, MessageSquare,
  Eye, RefreshCw, Plug, CheckCircle2, Power
} from "lucide-react";

interface ClientChatbotSettingsProps {
  adminMode?: boolean;
}

const ClientChatbotSettings = ({ adminMode = false }: ClientChatbotSettingsProps) => {
  const { botId } = useParams<{ botId: string }>();
  const { clientId: authClientId } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const widgetUrl = useWidgetUrl();

  const [botConfig, setBotConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [activeTab, setActiveTab] = useState("general");
  const clientId = botConfig?.client_id || authClientId;
  const backPath = adminMode ? "/admin/bots" : "/dashboard/bots";

  // General tab editable fields
  const [name, setName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [inactivityTimeout, setInactivityTimeout] = useState(30);
  const [leadFormMode, setLeadFormMode] = useState<"immediate" | "after_messages" | "smart">("smart");
  const [leadFormMessageCount, setLeadFormMessageCount] = useState(3);

  const tl = (it: string, en: string) => lang === "it" ? it : en;

  const fetchBot = useCallback(async () => {
    if (!botId) return;
    const { data } = await supabase
      .from("chatbot_configs")
      .select("*")
      .eq("id", botId)
      .single();
    if (data) {
      setBotConfig(data);
      setName(data.name);
      setSiteUrl((data as any).site_url || "");
      setIsActive(data.is_active ?? true);
      setInactivityTimeout((data as any).inactivity_timeout_minutes ?? 30);
      setLeadFormMode(((data as any).lead_form_mode as any) || "smart");
      setLeadFormMessageCount((data as any).lead_form_message_count ?? 3);
    }
    setLoading(false);
  }, [botId]);

  useEffect(() => { fetchBot(); }, [fetchBot]);

  const saveGeneral = async () => {
    if (!botId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("chatbot_configs")
        .update({ name, site_url: siteUrl, is_active: isActive, inactivity_timeout_minutes: inactivityTimeout, lead_form_mode: leadFormMode, lead_form_message_count: leadFormMessageCount } as any)
        .eq("id", botId);
      if (error) throw error;
      toast({ title: "✅", description: tl("Impostazioni salvate!", "Settings saved!") });
      fetchBot();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const copyToken = () => {
    if (!botConfig?.embed_token) return;
    navigator.clipboard.writeText(botConfig.embed_token);
    toast({ title: tl("Copiato!", "Copied!"), description: tl("Token copiato", "Token copied") });
  };

  const copyEmbed = () => {
    if (!botConfig?.embed_token) return;
    const snippet = `<!-- ${name} -->\n<script src="${widgetUrl}" data-token="${botConfig.embed_token}" async></script>`;
    navigator.clipboard.writeText(snippet);
    toast({ title: tl("Copiato!", "Copied!"), description: tl("Codice embed copiato", "Embed code copied") });
  };

  const iframeSrcDoc = botConfig?.embed_token
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preview</title><style>body{margin:0;background:#f0f0f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666;}
.hint{text-align:center;padding:2rem;}.hint p{font-size:14px;margin:8px 0;}</style></head><body>
<div class="hint"><p>👇 ${tl("Clicca il pulsante per aprire il chatbot", "Click the button to open the chatbot")}</p></div>
<script>try{Object.keys(sessionStorage).forEach(function(k){if(k.startsWith('genius_widget_'))sessionStorage.removeItem(k)});}catch(e){}<\/script>
<script src="${widgetUrl}" data-token="${botConfig.embed_token}" async><\/script>
</body></html>`
    : "";

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!botConfig) {
    return (
      <div className="p-6">
        <Link to={backPath} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft className="w-4 h-4" /> {tl("Torna ai chatbot", "Back to chatbots")}
        </Link>
        <p className="mt-4 text-muted-foreground">{tl("Chatbot non trovato", "Chatbot not found")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in-up">
      {/* Back link + title */}
      <div>
        <Link to={backPath} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> {tl("Torna ai chatbot", "Back to chatbots")}
        </Link>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
          {name || botConfig.name}
        </h1>
        {siteUrl && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Globe className="w-3.5 h-3.5" /> {siteUrl}</p>}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="general" className="gap-1.5 text-xs"><Settings className="w-3.5 h-3.5" /> {tl("Generale", "General")}</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-xs"><Palette className="w-3.5 h-3.5" /> {tl("Aspetto", "Appearance")}</TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5 text-xs"><MessageSquare className="w-3.5 h-3.5" /> {tl("Messaggi e fallback", "Messages & fallback")}</TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5 text-xs"><Database className="w-3.5 h-3.5" /> Conoscenza</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5 text-xs"><Plug className="w-3.5 h-3.5" /> {tl("Integrazioni", "Integrations")}</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye className="w-3.5 h-3.5" /> Preview</TabsTrigger>
        </TabsList>


        {/* Tab 1 — General */}
        <TabsContent value="general">
          <div className="glass rounded-xl p-6 space-y-5">
            <h3 className="font-semibold text-foreground">{tl("Impostazioni Generali", "General Settings")}</h3>

            {/* Bot active — prominent state card at top */}
            <div
              className={`flex items-center justify-between gap-3 p-5 rounded-xl border transition-colors ${
                isActive
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/5 border-red-500/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <Power className={`w-5 h-5 mt-0.5 ${isActive ? "text-green-500" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                    {tl("Bot attivo", "Bot active")}
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        isActive
                          ? "text-green-500 border-green-500/30 bg-green-500/10"
                          : "text-muted-foreground border-border bg-secondary"
                      }`}
                    >
                      {isActive ? tl("🟢 Attivo", "🟢 Active") : tl("⚪ Inattivo", "⚪ Inactive")}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{tl("Abilita/disabilita il widget", "Enable/disable the widget")}</p>
                </div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label>{tl("Nome del bot", "Bot name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <Label>{tl("URL del sito", "Site URL")}</Label>
              <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://mysite.com" className="bg-secondary border-border" />
            </div>

            {/* Chat inactivity timeout — own card */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <div className="space-y-2">
                <Label>{tl("Quando una chat è da ritenersi conclusa", "When a chat should be considered ended")}</Label>
                <p className="text-xs text-muted-foreground">
                  {tl("Dopo quanti minuti di inattività la chat viene chiusa automaticamente", "After how many minutes of inactivity the chat is automatically closed")}
                </p>
                <div className="flex gap-2 flex-wrap pt-1">
                  {[30, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInactivityTimeout(m)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 md:py-2 rounded-full text-sm font-medium transition-all min-h-[44px] border ${
                        inactivityTimeout === m
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {inactivityTimeout === m && <CheckCircle2 className="w-4 h-4" />}
                      {m} {tl("minuti", "minutes")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lead form timing — own card */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <div className="space-y-2">
                <Label>{tl("Quando mostrare il form per lasciare nome e contatti", "When to show the contact form")}</Label>
                <p className="text-xs text-muted-foreground">
                  {tl("Scegli quando il bot chiede nome ed email al visitatore", "Choose when the bot asks the visitor for name and email")}
                </p>
                <div className="flex gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => setLeadFormMode("immediate")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 md:py-2 rounded-full text-sm font-medium transition-all min-h-[44px] border ${
                      leadFormMode === "immediate"
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {leadFormMode === "immediate" && <CheckCircle2 className="w-4 h-4" />}
                    {tl("Subito all'inizio della chat", "Right at the start of the chat")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (leadFormMode === "immediate") setLeadFormMode("smart"); }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 md:py-2 rounded-full text-sm font-medium transition-all min-h-[44px] border ${
                      leadFormMode !== "immediate"
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {leadFormMode !== "immediate" && <CheckCircle2 className="w-4 h-4" />}
                    {tl("Durante la conversazione", "During the conversation")}
                  </button>
                </div>

                {leadFormMode !== "immediate" && (
                  <div className="flex gap-2 flex-wrap items-center pt-2 pl-1 border-l-2 border-border ml-1 pl-4">
                    <button
                      type="button"
                      onClick={() => setLeadFormMode("after_messages")}
                      className={`flex items-center gap-1.5 px-4 py-2.5 md:py-2 rounded-full text-sm font-medium transition-all min-h-[44px] border ${
                        leadFormMode === "after_messages"
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {leadFormMode === "after_messages" && <CheckCircle2 className="w-4 h-4" />}
                      {tl("Dopo un numero di messaggi", "After a number of messages")}
                    </button>
                    {leadFormMode === "after_messages" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={leadFormMessageCount}
                          onChange={(e) => setLeadFormMessageCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                          className="bg-secondary border-border w-20"
                        />
                        <span className="text-sm text-muted-foreground">{tl("messaggi", "messages")}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setLeadFormMode("smart")}
                      className={`flex items-center gap-1.5 px-4 py-2.5 md:py-2 rounded-full text-sm font-medium transition-all min-h-[44px] border ${
                        leadFormMode === "smart"
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {leadFormMode === "smart" && <CheckCircle2 className="w-4 h-4" />}
                      {tl("Solo su richiesta del bot (attuale)", "Only when the bot asks (current)")}
                    </button>
                  </div>
                )}
              </div>
            </div>







            {/* Embed token (read-only) */}
            <div className="space-y-2">
              <Label>{tl("Token Embed", "Embed Token")}</Label>
              <div className="flex gap-2">
                <Input value={botConfig.embed_token} readOnly className="bg-secondary border-border font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copyToken}><Copy className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Embed snippet (read-only) */}
            <div className="space-y-2">
              <Label>{tl("Codice Embed", "Embed Code")}</Label>
              <div className="bg-secondary rounded-lg p-3 relative">
                <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-all">
{`<!-- ${name} -->
<script src="${widgetUrl}" data-token="${botConfig.embed_token}" async></script>`}
                </pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 gap-1.5" onClick={copyEmbed}>
                  <Code2 className="w-3.5 h-3.5" /> {tl("Copia", "Copy")}
                </Button>
              </div>
            </div>

            <Button onClick={saveGeneral} disabled={saving} className="gradient-primary text-white border-0 glow-sm gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {tl("Salva", "Save")}
            </Button>
          </div>

          {/* Notifications (moved here from Appearance) */}
          {clientId && (
            <div className="mt-6">
              <ChatbotConfigForm clientId={clientId} chatbotId={botId} sectionFilter={["notifications"]} />
            </div>
          )}
        </TabsContent>

        {/* Tab 2 — Appearance (reuse ChatbotConfigForm, identity as first internal tab) */}
        <TabsContent value="appearance">
          {clientId && <ChatbotConfigForm clientId={clientId} chatbotId={botId} sectionFilter={["identity", "appearance"]} />}
        </TabsContent>

        {/* Tab 2b — Messages & fallback */}
        <TabsContent value="messages">
          {clientId && <ChatbotConfigForm clientId={clientId} chatbotId={botId} sectionFilter={["messages"]} />}
        </TabsContent>



        {/* Knowledge hub (FAQ / Documenti / Istruzioni) */}
        <TabsContent value="knowledge">
          <ClientRAGKnowledgeBase overrideChatbotId={botId} />
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <ClientIntegrations embedded clientIdOverride={clientId} />
        </TabsContent>


        {/* Tab 6 — Preview */}
        <TabsContent value="preview">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">{tl("Anteprima live del widget", "Live widget preview")}</p>
              <Button variant="outline" size="sm" onClick={() => setPreviewKey(k => k + 1)} className="gap-2 border-border">
                <RefreshCw className="w-3.5 h-3.5" /> {tl("Ricarica", "Reload")}
              </Button>
            </div>
            {botConfig.embed_token ? (
              <div className="glass rounded-xl overflow-hidden border border-border" style={{ minHeight: 550 }}>
                <iframe
                  key={previewKey}
                  srcDoc={iframeSrcDoc}
                  className="w-full h-full border-0"
                  style={{ minHeight: 550 }}
                  title="Widget Preview"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            ) : (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-muted-foreground">{tl("Nessun chatbot configurato", "No chatbot configured")}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientChatbotSettings;
