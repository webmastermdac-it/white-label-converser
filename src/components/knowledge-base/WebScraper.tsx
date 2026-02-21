import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Globe, Loader2, Check } from "lucide-react";

interface DetectedPage {
  url: string;
  title: string;
  selected: boolean;
}

interface Props {
  scrapedContent: string;
  onUseContent: (content: string) => void;
}

const WebScraper: React.FC<Props> = ({ scrapedContent, onUseContent }) => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pages, setPages] = useState<DetectedPage[]>([]);
  const [content, setContent] = useState(scrapedContent || "");
  const [mainContent, setMainContent] = useState("");

  const analyze = async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setPages([]);
    setMainContent("");

    try {
      const { data, error } = await supabase.functions.invoke("scrape-website", {
        body: { url: url.trim(), mode: "analyze" },
      });

      if (error) throw error;

      setMainContent(data?.content || "");
      setPages(
        (data?.links || []).slice(0, 10).map((l: any) => ({
          url: l.url,
          title: l.title || l.url,
          selected: false,
        }))
      );
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const togglePage = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const importSelected = async () => {
    const selectedUrls = pages.filter((p) => p.selected).map((p) => p.url);
    if (selectedUrls.length === 0) {
      toast({ title: "Nessuna pagina selezionata", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-website", {
        body: { urls: selectedUrls, mode: "scrape" },
      });

      if (error) throw error;

      const combined = [mainContent, ...(data?.contents || [])].filter(Boolean).join("\n\n---\n\n");
      setContent(combined);
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tuosito.com"
          className="bg-secondary border-border"
        />
        <Button onClick={analyze} disabled={analyzing || !url.trim()}>
          {analyzing ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Globe className="w-4 h-4 mr-1" />
          )}
          Analizza Sito
        </Button>
      </div>

      {mainContent && (
        <div className="p-3 rounded-xl bg-secondary border border-border">
          <p className="text-xs font-medium text-foreground mb-2">Contenuto pagina principale:</p>
          <p className="text-xs text-muted-foreground line-clamp-4">{mainContent.slice(0, 400)}...</p>
        </div>
      )}

      {pages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Pagine trovate:</p>
          {pages.map((page, i) => (
            <label
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border hover:bg-accent cursor-pointer"
            >
              <Checkbox
                checked={page.selected}
                onCheckedChange={() => togglePage(i)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{page.title}</p>
                <p className="text-xs text-muted-foreground truncate">{page.url}</p>
              </div>
            </label>
          ))}
          <Button
            onClick={importSelected}
            disabled={importing || !pages.some((p) => p.selected)}
            variant="outline"
            className="w-full"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            Importa Pagine Selezionate
          </Button>
        </div>
      )}

      {content && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Contenuto estratto:</p>
          <Textarea
            value={content}
            readOnly
            rows={10}
            className="bg-secondary border-border resize-none text-xs font-mono"
          />
          <Button
            onClick={() => {
              onUseContent(content);
              toast({ title: "Contenuto salvato nella knowledge base" });
            }}
            className="gradient-primary text-white border-0"
          >
            <Check className="w-4 h-4 mr-1" />
            Usa Questo Contenuto
          </Button>
        </div>
      )}
    </div>
  );
};

export default WebScraper;
