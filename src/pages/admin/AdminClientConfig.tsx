import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ChatbotConfigForm from "@/components/ChatbotConfigForm";
import { Loader2, ArrowLeft, Eye, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";

const AdminClientConfig = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { t } = useLanguage();
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [embedToken, setEmbedToken] = useState("");
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      supabase.from("clients").select("name").eq("id", clientId).single(),
      supabase.from("chatbot_configs").select("embed_token").eq("client_id", clientId).single(),
    ]).then(([clientRes, configRes]) => {
      setClientName(clientRes.data?.name || "Client");
      setEmbedToken(configRes.data?.embed_token || "");
      setLoading(false);
    });
  }, [clientId]);

  const widgetScriptUrl = "https://chatbot.your-genius.com/widget.js";

  const iframeSrcDoc = embedToken
    ? `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Widget Preview</title>
<style>body{margin:0;background:#f0f0f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666;}
.hint{text-align:center;padding:2rem;}.hint p{font-size:14px;margin:8px 0;}.hint small{opacity:.6;font-size:12px;}</style>
</head><body>
<div class="hint"><p>👇 Clicca sul pulsante in basso a destra per aprire il chatbot</p><small>Anteprima live del widget</small></div>
<script>
try { Object.keys(sessionStorage).forEach(function(k) { if (k.startsWith('genius_widget_')) sessionStorage.removeItem(k); }); } catch(e) {}
<\/script>
<script src="${widgetScriptUrl}" data-token="${embedToken}" async><\/script>
</body></html>`
    : "";

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
          {clientName} — {t("botSettingsTitle")}
        </h1>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="config">{t("botSettings")}</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="w-3.5 h-3.5" /> {t("widgetPreview")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ChatbotConfigForm clientId={clientId} />
        </TabsContent>

        <TabsContent value="preview">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {t("widgetPreviewDesc")}
              </p>
              <Button variant="outline" size="sm" onClick={() => setPreviewKey(k => k + 1)} className="gap-2 border-border">
                <RefreshCw className="w-3.5 h-3.5" /> {t("reload")}
              </Button>
            </div>
            {embedToken ? (
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
                <p className="text-muted-foreground">{t("noChatbotConfigured")}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminClientConfig;
