import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Bot, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientChatPreview = () => {
  const { clientId } = useAuth();
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

  const iframeSrc = embedToken
    ? `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Widget Preview</title>
<style>body{margin:0;background:#f0f0f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#666;}
.hint{text-align:center;padding:2rem;}.hint p{font-size:14px;margin:8px 0;}.hint small{opacity:.6;font-size:12px;}</style>
</head><body>
<div class="hint"><p>👇 Clicca sul pulsante in basso a destra per aprire il chatbot</p><small>Questa è un'anteprima live del widget</small></div>
<script src="${window.location.origin}/widget.js" data-token="${embedToken}" async></script>
</body></html>`)}`
    : "";

  const reset = () => setKey((k) => k + 1);

  return (
    <div className="p-6 space-y-4 animate-fade-in-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            Anteprima Widget
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Testa il chatbot esattamente come apparirà sul tuo sito
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-2 border-border">
            <RefreshCw className="w-3.5 h-3.5" />
            Ricarica
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border"
            onClick={() => window.open(iframeSrc, "_blank")}
            disabled={!embedToken}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Apri in nuova tab
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
          <p className="text-muted-foreground">Nessun chatbot configurato.</p>
          <a href="/dashboard/bot" className="text-primary text-sm hover:underline mt-1 inline-block">
            Configura prima il tuo bot →
          </a>
        </div>
      ) : (
        <div className="flex-1 glass rounded-xl overflow-hidden border border-border" style={{ minHeight: 550 }}>
          <iframe
            ref={iframeRef}
            key={key}
            src={iframeSrc}
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
