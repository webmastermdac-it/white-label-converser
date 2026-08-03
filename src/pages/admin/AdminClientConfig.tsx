import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ChatbotConfigForm from "@/components/ChatbotConfigForm";
import { Loader2, ArrowLeft, Eye, RefreshCw, Bot, Globe, Activity, Copy, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { useWidgetUrl } from "@/hooks/useWidgetUrl";
import { useToast } from "@/hooks/use-toast";
import ClientRAGKnowledgeBase from "@/pages/client/ClientRAGKnowledgeBase";

interface BotRow {
  id: string;
  name: string;
  site_url: string;
  embed_token: string;
  is_active: boolean;
  lead_count: number;
  chat_count: number;
}

const AdminClientConfig = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();
  const widgetScriptUrl = useWidgetUrl();
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      const [clientRes, botsRes] = await Promise.all([
        supabase.from("clients").select("name").eq("id", clientId).single(),
        supabase.from("chatbot_configs").select("id, name, site_url, embed_token, is_active").eq("client_id", clientId).eq("is_platform_bot", false).order("created_at"),
      ]);
      setClientName(clientRes.data?.name || "Client");

      const configs = (botsRes.data || []) as any[];
      const withCounts = await Promise.all(configs.map(async (bot: any) => {
        const [leads, chats] = await Promise.all([
          supabase.from("leads").select("id", { count: "exact", head: true }).eq("bot_id", bot.id),
          supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("bot_id", bot.id),
        ]);
        return { ...bot, site_url: bot.site_url || "", lead_count: leads.count || 0, chat_count: chats.count || 0 };
      }));
      setBots(withCounts);
      setLoading(false);
    };
    load();
  }, [clientId]);

  const selectedBot = bots.find(b => b.id === selectedBotId);

  const iframeSrcDoc = selectedBot?.embed_token
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preview</title><style>body{margin:0;background:#f0f0f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666;}</style></head><body>
<div style="text-align:center;padding:2rem"><p>👇 Click to open chatbot</p></div>
<script>try{Object.keys(sessionStorage).forEach(function(k){if(k.startsWith('genius_widget_'))sessionStorage.removeItem(k)});}catch(e){}<\/script>
<script src="${widgetScriptUrl}" data-token="${selectedBot.embed_token}" async><\/script>
</body></html>`
    : "";

  const toggleActive = async (bot: BotRow) => {
    await supabase.from("chatbot_configs").update({ is_active: !bot.is_active }).eq("id", bot.id);
    setBots(prev => prev.map(b => b.id === bot.id ? { ...b, is_active: !b.is_active } : b));
  };

  if (loading || !clientId) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <Link to="/admin/clients" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> {t("clients", "Clienti")}
        </Link>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
          {clientName}
        </h1>
      </div>

      {/* Bot list or selected bot */}
      {!selectedBotId ? (
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Il Bot di {clientName}</h2>
          {bots.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-muted-foreground">
              <Bot className="w-8 h-8 mx-auto mb-2" />
              <p>Nessun chatbot</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bots.map((bot) => (
                <div key={bot.id} className="glass rounded-xl p-5 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{bot.name}</h3>
                      {bot.site_url && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3" /> {bot.site_url}
                        </p>
                      )}
                    </div>
                    <Badge variant={bot.is_active ? "default" : "secondary"} className={bot.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}>
                      <Activity className="w-3 h-3 mr-1" />
                      {bot.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Leads</p><p className="font-bold text-foreground">{bot.lead_count}</p></div>
                    <div><p className="text-xs text-muted-foreground">Chats</p><p className="font-bold text-foreground">{bot.chat_count}</p></div>
                    <div><p className="text-xs text-muted-foreground">Token</p><p className="font-mono text-xs text-foreground truncate">{bot.embed_token.slice(0, 12)}…</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelectedBotId(bot.id)}>
                      <Settings className="w-3.5 h-3.5" /> Configure
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(bot)}>
                      {bot.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(bot.embed_token); toast({ title: "Copied!" }); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedBotId(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Tutti i chatbot
          </Button>
          <h2 className="font-semibold text-foreground text-lg">{selectedBot?.name}</h2>

          <Tabs defaultValue="config">
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger value="config">{t("botSettings")}</TabsTrigger>
              <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="w-3.5 h-3.5" /> Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config">
              <ChatbotConfigForm clientId={clientId} chatbotId={selectedBotId} />
            </TabsContent>

            <TabsContent value="kb">
              <ClientRAGKnowledgeBase overrideChatbotId={selectedBotId} />
            </TabsContent>

            <TabsContent value="preview">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">{t("widgetPreviewDesc")}</p>
                  <Button variant="outline" size="sm" onClick={() => setPreviewKey(k => k + 1)} className="gap-2 border-border">
                    <RefreshCw className="w-3.5 h-3.5" /> {t("reload")}
                  </Button>
                </div>
                {selectedBot?.embed_token ? (
                  <div className="glass rounded-xl overflow-hidden border border-border" style={{ minHeight: 550 }}>
                    <iframe key={previewKey} srcDoc={iframeSrcDoc} className="w-full h-full border-0" style={{ minHeight: 550 }} title="Preview" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                  </div>
                ) : (
                  <div className="glass rounded-xl p-8 text-center"><p className="text-muted-foreground">{t("noChatbotConfigured")}</p></div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default AdminClientConfig;
