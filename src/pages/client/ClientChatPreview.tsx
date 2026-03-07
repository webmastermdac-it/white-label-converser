import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Bot, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientChatPreview = () => {
  const { clientId } = useAuth();
  const { t } = useLanguage();
  const [embedToken, setEmbedToken] = useState("");
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("chatbot_configs")
      .select("embed_token")
      .eq("client_id", clientId)
      .single()
      .then(({ data }) => {
        setEmbedToken(data?.embed_token || "");
        setLoading(false);
      });
  }, [clientId]);

  const widgetScriptUrl = `${window.location.origin}/widget.js`;

  const previewHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Widget Preview</title>
<style>body{margin:0;background:#f0f0f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666;}
.hint{text-align:center;padding:2rem;}.hint p{font-size:14px;margin:8px 0;}.hint small{opacity:.6;font-size:12px;}</style>
</head><body>
<div class="hint"><p>👇 ${t("widgetPreviewDesc")}</p></div>
<script>
// Clear widget session storage to force fresh config + welcome message
try {
  Object.keys(sessionStorage).forEach(function(k) {
    if (k.startsWith('genius_widget_')) sessionStorage.removeItem(k);
  });
} catch(e) {}
<\/script>
<script src="${widgetScriptUrl}" data-token="${embedToken}" async><\/script>
</body></html>`;

  const iframeSrcDoc = embedToken ? previewHtml : "";

  const openInNewTab = () => {
    if (!embedToken) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            {t("widgetPreview")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("widgetPreviewDesc")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)} className="gap-2 border-border">
            <RefreshCw className="w-3.5 h-3.5" />
            {t("reload")}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 border-border" onClick={openInNewTab} disabled={!embedToken}>
            <ExternalLink className="w-3.5 h-3.5" />
            {t("openNewTab")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !embedToken ? (
        <div className="glass rounded-xl p-8 text-center flex-1 flex flex-col items-center justify-center">
          <Bot className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("noChatbotConfigured")}</p>
          <a href="/dashboard/bot" className="text-primary text-sm hover:underline mt-1 inline-block">{t("configureFirst")}</a>
        </div>
      ) : (
        <div className="flex-1 glass rounded-xl overflow-hidden border border-border" style={{ minHeight: 550 }}>
          <iframe
            ref={iframeRef}
            key={key}
            srcDoc={iframeSrcDoc}
            className="w-full h-full border-0"
            style={{ minHeight: 550 }}
            title="Widget Preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      )}
    </div>
  );
};

export default ClientChatPreview;
