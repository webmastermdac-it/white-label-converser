import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Upload, Globe, HelpCircle, FileText, Trash2,
  RefreshCw, CheckCircle2, XCircle, Clock, Plus, Database,
  Search, Map, Send, AlertTriangle, GripVertical, X, Lock, BrainCircuit
} from "lucide-react";

interface KBSource {
  id: string;
  chatbot_id: string;
  name: string;
  type: string;
  source_url: string | null;
  file_path: string | null;
  status: string;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { icon: any; cls: string; label: string }> = {
  processing: { icon: Clock, cls: "bg-warning/10 text-warning border-warning/30", label: "Elaborazione..." },
  ready: { icon: CheckCircle2, cls: "bg-success/10 text-success border-success/30", label: "Pronto" },
  error: { icon: XCircle, cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Errore" },
  outdated: { icon: RefreshCw, cls: "bg-primary/10 text-primary border-primary/30", label: "Da aggiornare" },
};

const ClientRAGKnowledgeBase = () => {
  const { clientId } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { canUploadDocs, canUseKBWizard, maxFaqs, config: planConfig } = usePlanConfig();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeRequiredPlan, setUpgradeRequiredPlan] = useState<"starter" | "pro">("starter");
  const [sources, setSources] = useState<KBSource[]>([]);
  const [chatbotId, setChatbotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("file");

  // Form states
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [sitemapInput, setSitemapInput] = useState("");
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([{ q: "", a: "" }]);
  const [freeText, setFreeText] = useState("");
  const [freeTextName, setFreeTextName] = useState("");

  // Drag & drop
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search test
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const t = (it: string, en: string) => lang === "it" ? it : en;
  const isFree = planConfig?.plan_name === "free";

  const showUpgrade = (plan: "starter" | "pro" = "starter") => {
    setUpgradeRequiredPlan(plan);
    setUpgradeOpen(true);
  };

  // Count existing FAQ sources
  const existingFaqCount = sources.filter(s => s.type === "faq").length;
  const faqLimitReached = maxFaqs !== -1 && existingFaqCount >= maxFaqs;

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    const { data: config } = await supabase
      .from("chatbot_configs")
      .select("id")
      .eq("client_id", clientId)
      .limit(1)
      .single();
    if (!config) { setLoading(false); return; }
    setChatbotId(config.id);

    const { data } = await supabase
      .from("knowledge_base" as any)
      .select("*")
      .eq("chatbot_id", config.id)
      .order("created_at", { ascending: false });
    setSources((data as any as KBSource[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const hasProcessing = sources.some(s => s.status === "processing");
    if (!hasProcessing) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [sources, fetchData]);

  const processSource = async (sourceId: string) => {
    try {
      await supabase.functions.invoke("process-knowledge", {
        body: { knowledge_base_id: sourceId },
      });
    } catch (err) {
      console.error("Process error:", err);
    }
  };

  // --- File upload ---
  const uploadFiles = async (files: FileList | File[]) => {
    if (!chatbotId || isFree) { showUpgrade("starter"); return; }
    const allowed = ["pdf", "docx", "doc", "txt", "md", "csv", "xlsx"];
    const fileArr = Array.from(files);
    const valid = fileArr.filter(f => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (!allowed.includes(ext)) {
        toast({ title: `${f.name}: ${t("Formato non supportato", "Unsupported format")}`, variant: "destructive" });
        return false;
      }
      if (f.size > 50 * 1024 * 1024) {
        toast({ title: `${f.name}: ${t("File troppo grande (max 50MB)", "File too large (max 50MB)")}`, variant: "destructive" });
        return false;
      }
      return true;
    });
    if (!valid.length) return;

    setUploading(true);
    for (const file of valid) {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const storagePath = `${clientId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("kb-documents").upload(storagePath, file);
        if (uploadErr) throw uploadErr;

        const { data: source, error: insertErr } = await supabase
          .from("knowledge_base" as any)
          .insert({ chatbot_id: chatbotId, name: file.name, type: ext, file_path: storagePath, status: "processing" } as any)
          .select()
          .single();
        if (insertErr) throw insertErr;
        processSource((source as any).id);
      } catch (err: any) {
        toast({ title: `${file.name}: ${err.message}`, variant: "destructive" });
      }
    }
    toast({ title: t(`${valid.length} file caricati`, `${valid.length} files uploaded`) });
    setUploading(false);
    fetchData();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    if (isFree) { showUpgrade("starter"); return; }
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  // --- URL ---
  const handleAddUrl = async () => {
    if (isFree) { showUpgrade("starter"); return; }
    if (!urlInput.trim() || !chatbotId) return;
    setUploading(true);
    try {
      const formattedUrl = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
      const { data: source, error } = await supabase
        .from("knowledge_base" as any)
        .insert({ chatbot_id: chatbotId, name: new URL(formattedUrl).hostname, type: "url", source_url: urlInput.trim(), status: "processing" } as any)
        .select().single();
      if (error) throw error;
      setUrlInput("");
      processSource((source as any).id);
      toast({ title: t("URL aggiunto", "URL added") });
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  // --- Sitemap ---
  const handleAddSitemap = async () => {
    if (isFree) { showUpgrade("starter"); return; }
    if (!sitemapInput.trim() || !chatbotId) return;
    setUploading(true);
    try {
      const sitemapUrl = sitemapInput.startsWith("http") ? sitemapInput : `https://${sitemapInput}`;
      const res = await fetch(sitemapUrl);
      const text = await res.text();
      const urlMatches = text.match(/<loc>(.*?)<\/loc>/g) || [];
      const urls = urlMatches.map(m => m.replace(/<\/?loc>/g, "")).slice(0, 50);

      if (!urls.length) {
        toast({ title: t("Nessun URL trovato nella sitemap", "No URLs found in sitemap"), variant: "destructive" });
        setUploading(false);
        return;
      }

      for (const url of urls) {
        const { data: source, error } = await supabase
          .from("knowledge_base" as any)
          .insert({ chatbot_id: chatbotId, name: new URL(url).pathname || url, type: "url", source_url: url, status: "processing" } as any)
          .select().single();
        if (!error && source) processSource((source as any).id);
      }

      setSitemapInput("");
      toast({ title: t(`${urls.length} pagine importate dalla sitemap`, `${urls.length} pages imported from sitemap`) });
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  // --- Inline FAQ ---
  const addFaqRow = () => setFaqItems(prev => [...prev, { q: "", a: "" }]);
  const removeFaqRow = (idx: number) => setFaqItems(prev => prev.filter((_, i) => i !== idx));
  const updateFaq = (idx: number, field: "q" | "a", val: string) => {
    setFaqItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };
  const handleSaveFaqs = async () => {
    if (isFree) { showUpgrade("starter"); return; }
    const validFaqs = faqItems.filter(f => f.q.trim() && f.a.trim());
    if (!validFaqs.length || !chatbotId) return;
    setUploading(true);
    for (const faq of validFaqs) {
      try {
        const content = `Q: ${faq.q.trim()}\nA: ${faq.a.trim()}`;
        const { data: source, error } = await supabase
          .from("knowledge_base" as any)
          .insert({ chatbot_id: chatbotId, name: `FAQ: ${faq.q.trim().slice(0, 50)}`, type: "faq", source_url: content, status: "processing" } as any)
          .select().single();
        if (!error && source) processSource((source as any).id);
      } catch (err: any) {
        toast({ title: err.message, variant: "destructive" });
      }
    }
    setFaqItems([{ q: "", a: "" }]);
    toast({ title: t(`${validFaqs.length} FAQ aggiunte`, `${validFaqs.length} FAQs added`) });
    setUploading(false);
    fetchData();
  };

  // --- Free text ---
  const handleAddFreeText = async () => {
    if (isFree) { showUpgrade("starter"); return; }
    if (!freeText.trim() || !chatbotId) return;
    setUploading(true);
    try {
      const { data: source, error } = await supabase
        .from("knowledge_base" as any)
        .insert({ chatbot_id: chatbotId, name: freeTextName.trim() || t("Testo libero", "Free text"), type: "txt", source_url: freeText.trim(), status: "processing" } as any)
        .select().single();
      if (error) throw error;
      setFreeText(""); setFreeTextName("");
      processSource((source as any).id);
      toast({ title: t("Testo aggiunto", "Text added") });
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  // --- Actions ---
  const handleDelete = async (source: KBSource) => {
    if (!confirm(t("Eliminare questa fonte?", "Delete this source?"))) return;
    try {
      await supabase.from("knowledge_chunks" as any).delete().eq("knowledge_base_id", source.id);
      if (source.file_path) await supabase.storage.from("kb-documents").remove([source.file_path]);
      await supabase.from("knowledge_base" as any).delete().eq("id", source.id);
      toast({ title: t("Fonte eliminata", "Source deleted") });
      fetchData();
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  };

  const handleReprocess = async (source: KBSource) => {
    if (isFree) { showUpgrade("starter"); return; }
    await supabase.from("knowledge_base" as any).update({ status: "processing" } as any).eq("id", source.id);
    fetchData();
    processSource(source.id);
    toast({ title: t("Rielaborazione avviata", "Reprocessing started") });
  };

  // --- Search test ---
  const handleSearchTest = async () => {
    if (isFree) { showUpgrade("starter"); return; }
    if (!searchQuery.trim() || !chatbotId) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("rag-search", {
        body: { query: searchQuery, chatbot_id: chatbotId, match_count: 5 },
      });
      if (error) throw error;
      setSearchResults(data?.chunks || []);
      if (!data?.chunks?.length) {
        toast({ title: t("Nessun risultato trovato", "No results found"), variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setSearching(false); }
  };

  const totalChunks = sources.filter(s => s.status === "ready").reduce((sum, s) => sum + s.chunk_count, 0);
  const readySources = sources.filter(s => s.status === "ready").length;
  const processingSources = sources.filter(s => s.status === "processing").length;

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const typeIcons: Record<string, any> = {
    pdf: FileText, docx: FileText, doc: FileText, txt: FileText,
    md: FileText, csv: FileText, xlsx: FileText, url: Globe, faq: HelpCircle,
  };

  // ─── FREE PLAN: Full locked state ───
  if (isFree) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            {t("Knowledge Base RAG", "RAG Knowledge Base")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("Gestisci le fonti di conoscenza del tuo chatbot con ricerca semantica avanzata",
              "Manage your chatbot's knowledge sources with advanced semantic search")}
          </p>
        </div>

        {/* Locked overlay card */}
        <div className="relative rounded-xl border border-border overflow-hidden">
          {/* Blurred background content to show what they're missing */}
          <div className="opacity-[0.15] pointer-events-none select-none p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass rounded-xl p-4 h-20 bg-secondary" />
              ))}
            </div>
            <div className="glass rounded-xl p-5 h-48 bg-secondary" />
            <div className="glass rounded-xl p-5 h-32 bg-secondary" />
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              {t("🔒 Funzionalità Premium", "🔒 Premium Feature")}
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6 px-4">
              {t(
                "La Ricerca Avanzata (RAG) e il caricamento documenti sono disponibili dal piano Starter a €49/mese. Fai upgrade per addestrare il tuo chatbot sui tuoi documenti aziendali.",
                "Advanced Search (RAG) and document upload are available on the Starter plan at €49/month. Upgrade to train your chatbot on your business documents."
              )}
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs px-4">
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0"
                onClick={() => showUpgrade("starter")}
              >
                {t("Fai Upgrade a Starter →", "Upgrade to Starter →")}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => showUpgrade("starter")}
              >
                {t("Scopri tutti i piani →", "See all plans →")}
              </Button>
            </div>
          </div>
        </div>

        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} requiredPlan={upgradeRequiredPlan} variant="rag" />
      </div>
    );
  }

  // ─── STARTER / PRO: Full access ───
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
          {t("Knowledge Base RAG", "RAG Knowledge Base")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("Gestisci le fonti di conoscenza del tuo chatbot con ricerca semantica avanzata",
            "Manage your chatbot's knowledge sources with advanced semantic search")}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Database, value: sources.length, label: t("Fonti totali", "Total sources"), iconCls: "text-primary" },
          { icon: CheckCircle2, value: readySources, label: t("Fonti pronte", "Ready sources"), iconCls: "text-success" },
          { icon: FileText, value: totalChunks, label: t("Chunk totali", "Total chunks"), iconCls: "text-primary" },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <stat.icon className={`w-5 h-5 ${stat.iconCls}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Processing banner */}
      {processingSources > 0 && (
        <div className="glass rounded-xl p-4 border-warning/30 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {t(`${processingSources} fonte/i in elaborazione...`, `${processingSources} source(s) processing...`)}
            </p>
            <Progress value={undefined} className="mt-2 h-1" />
          </div>
        </div>
      )}

      {/* Add sources panel */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          {t("Aggiungi fonti di conoscenza", "Add knowledge sources")}
        </h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="file" className="gap-1.5 text-xs"><Upload className="w-3.5 h-3.5" /> File</TabsTrigger>
            <TabsTrigger value="url" className="gap-1.5 text-xs"><Globe className="w-3.5 h-3.5" /> URL</TabsTrigger>
            <TabsTrigger value="sitemap" className="gap-1.5 text-xs"><Map className="w-3.5 h-3.5" /> Sitemap</TabsTrigger>
            <TabsTrigger value="faq" className="gap-1.5 text-xs"><HelpCircle className="w-3.5 h-3.5" /> FAQ</TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" /> {t("Testo", "Text")}</TabsTrigger>
          </TabsList>

          {/* FILE TAB */}
          <TabsContent value="file" className="mt-0">
            {!canUploadDocs ? (
              <div className="border-2 border-dashed rounded-xl p-8 text-center border-border">
                <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  {t("L'upload di documenti è disponibile dal piano Starter.", "Document upload is available on the Starter plan.")}
                </p>
                <Button variant="outline" size="sm" onClick={() => showUpgrade("starter")}>
                  {t("Fai Upgrade →", "Upgrade →")}
                </Button>
              </div>
            ) : (
            <div
              ref={dropRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className={`w-6 h-6 ${dragging ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("Trascina i file qui o clicca per selezionare", "Drag files here or click to select")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOCX, TXT, MD, CSV, XLSX · Max 50MB · {t("File multipli supportati", "Multiple files supported")}
                  </p>
                </div>
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            )}
          </TabsContent>

          {/* URL TAB */}
          <TabsContent value="url" className="mt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("Inserisci l'URL della pagina da importare e scrapare", "Enter the page URL to import and scrape")}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/page"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-secondary border-border text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              />
              <Button onClick={handleAddUrl} disabled={uploading || !urlInput.trim()} className="gap-1.5 shrink-0">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {t("Importa", "Import")}
              </Button>
            </div>
          </TabsContent>

          {/* SITEMAP TAB */}
          <TabsContent value="sitemap" className="mt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("Inserisci l'URL della sitemap XML per importare automaticamente tutte le pagine (max 50)",
                "Enter the XML sitemap URL to auto-import all pages (max 50)")}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/sitemap.xml"
                value={sitemapInput}
                onChange={(e) => setSitemapInput(e.target.value)}
                className="bg-secondary border-border text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddSitemap()}
              />
              <Button onClick={handleAddSitemap} disabled={uploading || !sitemapInput.trim()} className="gap-1.5 shrink-0">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Map className="w-4 h-4" />}
                {t("Importa sitemap", "Import sitemap")}
              </Button>
            </div>
          </TabsContent>

          {/* FAQ TAB */}
          <TabsContent value="faq" className="mt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("Aggiungi domande e risposte frequenti. Puoi aggiungere più FAQ contemporaneamente.",
                "Add frequently asked questions and answers. You can add multiple FAQs at once.")}
            </p>
            <div className="space-y-2">
              {faqItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start group">
                  <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Input
                      placeholder={t("Domanda...", "Question...")}
                      value={item.q}
                      onChange={(e) => updateFaq(idx, "q", e.target.value)}
                      className="bg-secondary border-border text-sm"
                    />
                    <Textarea
                      placeholder={t("Risposta...", "Answer...")}
                      value={item.a}
                      onChange={(e) => updateFaq(idx, "a", e.target.value)}
                      rows={2}
                      className="bg-secondary border-border text-sm resize-none"
                    />
                  </div>
                  {faqItems.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeFaqRow(idx)}
                      className="text-muted-foreground hover:text-destructive mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {faqLimitReached && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t(`Limite di ${maxFaqs} FAQ raggiunto. Fai upgrade per sbloccare FAQ illimitate.`,
                  `Limit of ${maxFaqs} FAQs reached. Upgrade to unlock unlimited FAQs.`)}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={faqLimitReached ? () => showUpgrade("starter") : addFaqRow} className="gap-1.5 border-border text-foreground">
                {faqLimitReached ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {t("Altra FAQ", "Add FAQ")}
              </Button>
              <Button size="sm" onClick={handleSaveFaqs}
                disabled={uploading || !faqItems.some(f => f.q.trim() && f.a.trim())} className="gap-1.5 ml-auto">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {t("Salva FAQ", "Save FAQs")}
              </Button>
            </div>
          </TabsContent>

          {/* TEXT TAB */}
          <TabsContent value="text" className="mt-0 space-y-3">
            <Input
              placeholder={t("Nome (opzionale)", "Name (optional)")}
              value={freeTextName}
              onChange={(e) => setFreeTextName(e.target.value)}
              className="bg-secondary border-border text-sm"
            />
            <Textarea
              placeholder={t("Incolla qui il testo della knowledge base...", "Paste knowledge base text here...")}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={6}
              className="bg-secondary border-border text-sm resize-none"
            />
            <Button onClick={handleAddFreeText} disabled={uploading || !freeText.trim()} className="w-full gap-1.5">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {t("Aggiungi testo", "Add text")}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sources list */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          {t("Fonti caricate", "Uploaded sources")}
          <Badge variant="outline" className="ml-auto text-xs">{sources.length}</Badge>
        </h2>

        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("Nessuna fonte aggiunta", "No sources added")}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
              {t("Usa il pannello sopra per aggiungere documenti, URL, FAQ o testo.",
                "Use the panel above to add documents, URLs, FAQs or text.")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => {
              const status = statusConfig[source.status] || statusConfig.error;
              const StatusIcon = status.icon;
              const TypeIcon = typeIcons[source.type] || FileText;

              return (
                <div
                  key={source.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{source.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0">{source.type}</Badge>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.cls}`}>
                        <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                        {status.label}
                      </Badge>
                      {source.status === "ready" && (
                        <span className="text-[10px] text-muted-foreground">{source.chunk_count} chunks</span>
                      )}
                    </div>
                    {source.error_message && (
                      <p className="text-[11px] text-destructive mt-0.5 truncate flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {source.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(source.status === "error" || source.status === "ready" || source.status === "outdated") && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReprocess(source)}
                        title={t("Rielabora", "Reprocess")}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(source)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search test tool */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          {t("Test Ricerca Semantica", "Semantic Search Test")}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t("Verifica il retrieval cercando nella knowledge base come farebbe il chatbot.",
            "Test retrieval by searching the knowledge base as the chatbot would.")}
        </p>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder={t("Es: Quali sono i vostri orari di apertura?", "E.g. What are your opening hours?")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary border-border text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSearchTest()}
          />
          <Button onClick={handleSearchTest} disabled={searching || !searchQuery.trim()} className="gap-1.5 shrink-0">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t("Cerca", "Search")}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((chunk, i) => (
              <div key={chunk.id || i} className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    {t("Risultato", "Result")} #{i + 1}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">
                    {(chunk.similarity * 100).toFixed(1)}% match
                  </Badge>
                </div>
                <p className="text-xs text-foreground/80 line-clamp-4 whitespace-pre-wrap">{chunk.content}</p>
                {chunk.metadata?.source_name && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    📄 {chunk.metadata.source_name}
                    {chunk.metadata.section && ` → ${chunk.metadata.section}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} requiredPlan={upgradeRequiredPlan} variant="rag" />
    </div>
  );
};

export default ClientRAGKnowledgeBase;
