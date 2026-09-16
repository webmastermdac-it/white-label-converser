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
  FileText, Copy, Code2, Globe, Save, Inbox, MessageSquare,
  Eye, RefreshCw, Plug
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
        .update({ name, site_url: siteUrl, is_active: isActive } as any)
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

            <div className="space-y-2">
              <Label>{tl("Nome del bot", "Bot name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <Label>{tl("URL del sito", "Site URL")}</Label>
              <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://mysite.com" className="bg-secondary border-border" />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
              <div>
                <p className="text-sm font-medium text-foreground">{tl("Bot attivo", "Bot active")}</p>
                <p className="text-xs text-muted-foreground">{tl("Abilita/disabilita il widget", "Enable/disable the widget")}</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
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

        {/* Tab 2 — Appearance (reuse ChatbotConfigForm) */}
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
