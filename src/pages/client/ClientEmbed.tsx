import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useWidgetUrl } from "@/hooks/useWidgetUrl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Code2, Loader2, ExternalLink, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ClientEmbed = () => {
  const { clientId } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const widgetBaseUrl = useWidgetUrl();
  const [embedToken, setEmbedToken] = useState("");
  const [botName, setBotName] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("chatbot_configs")
      .select("embed_token, name")
      .eq("client_id", clientId)
      .single()
      .then(({ data }) => {
        setEmbedToken(data?.embed_token || "");
        setBotName(data?.name || "");
        setLoading(false);
      });
  }, [clientId]);

  const fallbackUrl = `${widgetBaseUrl}?v=${Date.now()}`;

  const snippet = `<!-- ${botName || "Genius Chatbot"} -->
<script 
  src="${fallbackUrl}" 
  data-token="${embedToken}"
  async>
</script>`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast({ title: t("copied"), description: t("embedCopied") });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{t("embedCodeTitle")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("embedCodeDesc")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !embedToken ? (
        <div className="glass rounded-xl p-8 text-center">
          <Code2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("noChatbotConfigured")}</p>
          <a href="/dashboard/bot" className="text-primary text-sm hover:underline mt-1 inline-block">{t("configureFirst")}</a>
        </div>
      ) : (
        <>
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-sm">{t("htmlSnippet")}</h2>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/dashboard/preview")} size="sm" variant="outline" className="h-8 gap-1.5 border-border">
                  <Eye className="w-3.5 h-3.5" />
                  {t("testLive")}
                </Button>
                <Button onClick={copy} size="sm" className="gradient-primary text-white border-0 h-8">
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? t("copied") : t("copy")}
                </Button>
              </div>
            </div>

            <pre className="bg-secondary rounded-xl p-4 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap border border-border">
              {snippet}
            </pre>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>📌 {t("pasteSnippet")}</p>
              <p>• {t("worksOnAny")}</p>
              <p>• {t("asyncLoad")}</p>
              <p>• {t("shadowDom")}</p>
            </div>
          </div>

          <div className="glass rounded-xl p-6 space-y-3">
            <h2 className="font-semibold text-foreground text-sm">{t("embedToken")}</h2>
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl font-mono text-xs text-muted-foreground">
              <span className="flex-1 truncate">{embedToken}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => { navigator.clipboard.writeText(embedToken); toast({ title: t("tokenCopied") }); }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("keepTokenPrivate")}</p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-foreground text-sm mb-3">{t("integrationInstructions")}</h2>
            <div className="space-y-3">
              {[
                { title: "WordPress", desc: "footer.php → </body>" },
                { title: "Webflow", desc: "Project Settings → Custom Code → Footer" },
                { title: "Shopify", desc: "theme.liquid → </body>" },
                { title: "HTML", desc: "</body>" },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 p-3 bg-secondary rounded-xl">
                  <ExternalLink className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientEmbed;
