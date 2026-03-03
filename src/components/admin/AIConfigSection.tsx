import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, AlertTriangle } from "lucide-react";

const AIConfigSection = () => {
  const { toast } = useToast();
  const [provider, setProvider] = useState<string>("openai");
  const [originalProvider, setOriginalProvider] = useState<string>("openai");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [loading, setLoading] = useState(true);

  const hasChanged = provider !== originalProvider;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("ai_settings" as any)
      .select("*")
      .limit(1)
      .single();
    if (data) {
      const d = data as any;
      setSettingsId(d.id);
      setProvider(d.embedding_provider);
      setOriginalProvider(d.embedding_provider);
    }
    setLoading(false);
  };

  const saveProvider = async () => {
    if (!settingsId) return;
    setSaving(true);
    try {
      const dims = provider === "gemini" ? 768 : 1536;
      const { error } = await supabase
        .from("ai_settings" as any)
        .update({ embedding_provider: provider, embedding_dimensions: dims } as any)
        .eq("id", settingsId);
      if (error) throw error;
      setOriginalProvider(provider);
      toast({ title: "Provider salvato!", description: "I documenti esistenti devono essere re-indicizzati." });
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const reindexAll = async () => {
    setReindexing(true);
    try {
      // Get all knowledge_base sources and re-process them
      const { data: sources, error } = await supabase
        .from("knowledge_base")
        .select("id")
        .in("status", ["ready", "error"]);
      if (error) throw error;

      if (!sources || sources.length === 0) {
        toast({ title: "Nessun documento da re-indicizzare" });
        setReindexing(false);
        return;
      }

      let processed = 0;
      for (const source of sources) {
        await supabase.functions.invoke("process-knowledge", {
          body: { knowledge_base_id: source.id },
        });
        processed++;
      }

      toast({ title: `Re-indicizzazione avviata per ${processed} documenti` });
    } catch (err: any) {
      toast({ title: "Errore re-indicizzazione", description: err.message, variant: "destructive" });
    }
    setReindexing(false);
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 max-w-lg flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-6 max-w-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">Configurazione AI</h2>
          <p className="text-xs text-muted-foreground">Provider embedding per la knowledge base</p>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-muted-foreground text-sm">Provider Embedding</Label>
        <RadioGroup value={provider} onValueChange={setProvider} className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/50">
            <RadioGroupItem value="openai" id="openai" className="mt-0.5" />
            <div>
              <Label htmlFor="openai" className="text-sm font-medium text-foreground cursor-pointer">
                OpenAI — text-embedding-3-small
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                1536 dimensioni · Richiede API Key OpenAI · Qualità superiore
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/50">
            <RadioGroupItem value="gemini" id="gemini" className="mt-0.5" />
            <div>
              <Label htmlFor="gemini" className="text-sm font-medium text-foreground cursor-pointer">
                Gemini — text-embedding-004
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                768 dimensioni · Usa Lovable AI Gateway · Nessuna API Key aggiuntiva
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {hasChanged && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-destructive">
              Attenzione: cambio dimensioni embedding
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Passando da {originalProvider === "openai" ? "1536" : "768"} a {provider === "openai" ? "1536" : "768"} dimensioni, 
              tutti i documenti esistenti nella knowledge base dovranno essere <strong>re-indicizzati</strong>. 
              Gli embedding attuali non saranno più compatibili.
            </p>
          </div>
        </div>
      )}

      <Button onClick={saveProvider} disabled={saving || !hasChanged} className="gradient-primary text-white border-0 w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Salva Provider
      </Button>

      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-3">
          Dopo aver cambiato provider, usa questo pulsante per re-indicizzare tutti i documenti con il nuovo modello.
        </p>
        <Button
          variant="outline"
          onClick={reindexAll}
          disabled={reindexing || hasChanged}
          className="w-full border-border text-foreground"
        >
          {reindexing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Re-indicizza tutti i documenti
        </Button>
      </div>
    </div>
  );
};

export default AIConfigSection;
