import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Upload, Globe, HelpCircle, FileText, Trash2,
  RefreshCw, CheckCircle2, XCircle, Clock, Plus, Database,
  Search, Map, Send, AlertTriangle, GripVertical, X, Lock, BrainCircuit, Sparkles, Save, Wand2,
  Info, Lightbulb, PenLine, ArrowDown
} from "lucide-react";
import IndustryTemplateSelector from "@/components/knowledge-base/IndustryTemplateSelector";

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

const MAX_FREE_PROMPT_CHARS = 2000;
const MAX_FREE_FAQS = 5;

const ClientRAGKnowledgeBase = ({ overrideClientId }: { overrideClientId?: string } = {}) => {
  const { clientId: authClientId } = useAuth();
  const clientId = overrideClientId || authClientId;
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { canUploadDocs, canUseKBWizard, maxFaqs, config: planConfig } = usePlanConfig();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeRequiredPlan, setUpgradeRequiredPlan] = useState<"starter" | "pro">("starter");
  const [sources, setSources] = useState<KBSource[]>([]);
  const [chatbotId, setChatbotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("file");

  // System prompt for free/paid
  const [systemPrompt, setSystemPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Free FAQ
  const [freeFaqs, setFreeFaqs] = useState<{ q: string; a: string }[]>([]);

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

  // Web crawler
  const [webMode, setWebMode] = useState<"single" | "crawl" | "sitemap">("single");
  const [crawlerUrl, setCrawlerUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [crawledPages, setCrawledPages] = useState<{ url: string; title: string; selected: boolean }[]>([]);
  const [crawlImporting, setCrawlImporting] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState({ current: 0, total: 0 });

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

  const existingFaqCount = sources.filter(s => s.type === "faq").length;
  const faqLimitReached = maxFaqs !== -1 && existingFaqCount >= maxFaqs;

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    const { data: config } = await supabase
      .from("chatbot_configs")
      .select("*")
      .eq("client_id", clientId)
      .limit(1)
      .single();
    if (!config) { setLoading(false); return; }
    setChatbotId(config.id);
    setSystemPrompt(config.knowledge_base || "");

    // Load free FAQs from knowledge_base_sections
    const sections = config.knowledge_base_sections as any;
    if (sections?.faqs && Array.isArray(sections.faqs)) {
      setFreeFaqs(sections.faqs.map((f: any) => ({ q: f.question || "", a: f.answer || "" })));
    }

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

  // --- Save system prompt + free FAQs ---
  const saveKnowledgeBase = async () => {
    if (!chatbotId) return;
    setSavingPrompt(true);
    try {
      const faqsForSections = freeFaqs.filter(f => f.q.trim() || f.a.trim()).map(f => ({ question: f.q, answer: f.a }));
      const { error } = await supabase
        .from("chatbot_configs")
        .update({
          knowledge_base: systemPrompt,
          knowledge_base_sections: { faqs: faqsForSections },
        } as any)
        .eq("id", chatbotId);
      if (error) throw error;
      toast({ title: "✅", description: t("Knowledge base salvata!", "Knowledge base saved!") });
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setSavingPrompt(false);
  };

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
    if (!chatbotId) return;
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

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  // --- URL ---
  const preScrapeUrl = async (url: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("scrape-website", {
      body: { mode: "scrape", urls: [url] },
    });
    if (error) throw error;
    return (data?.contents || []).join("\n\n");
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim() || !chatbotId) return;
    setUploading(true);
    try {
      const formattedUrl = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
      const scraped = await preScrapeUrl(formattedUrl);
      if (!scraped.trim()) throw new Error(t("Nessun testo estratto dall'URL", "No text extracted from URL"));
      const { data: source, error } = await supabase
        .from("knowledge_base" as any)
        .insert({ chatbot_id: chatbotId, name: new URL(formattedUrl).hostname, type: "txt", source_url: scraped, status: "processing" } as any)
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
        try {
          const scraped = await preScrapeUrl(url);
          if (!scraped.trim()) continue;
          const { data: source, error } = await supabase
            .from("knowledge_base" as any)
            .insert({ chatbot_id: chatbotId, name: new URL(url).pathname || url, type: "txt", source_url: scraped, status: "processing" } as any)
            .select().single();
          if (!error && source) processSource((source as any).id);
        } catch { continue; }
      }

      setSitemapInput("");
      toast({ title: t(`${urls.length} pagine importate dalla sitemap`, `${urls.length} pages imported from sitemap`) });
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  // --- Crawl: analyze site ---
  const handleAnalyzeSite = async () => {
    if (!crawlerUrl.trim()) return;
    setAnalyzing(true);
    setCrawledPages([]);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-website", {
        body: { url: crawlerUrl.trim(), mode: "analyze" },
      });
      if (error) throw error;
      const links = (data?.links || []).slice(0, 20).map((l: any) => ({
        url: l.url,
        title: l.title || new URL(l.url).pathname,
        selected: false,
      }));
      setCrawledPages(links);
      if (!links.length) {
        toast({
          title: t("Nessuna pagina trovata", "No pages found"),
          description: t("Prova la modalità Sitemap se il sito usa JavaScript.", "Try Sitemap mode if the site uses JavaScript."),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: t("Errore analisi", "Analysis error"), description: err.message, variant: "destructive" });
    } finally { setAnalyzing(false); }
  };

  const toggleCrawlPage = (idx: number) => {
    setCrawledPages(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };
  const selectAllCrawl = (val: boolean) => {
    setCrawledPages(prev => prev.map(p => ({ ...p, selected: val })));
  };

  const handleImportCrawledPages = async () => {
    if (!chatbotId) return;
    const selected = crawledPages.filter(p => p.selected);
    if (!selected.length) {
      toast({ title: t("Nessuna pagina selezionata", "No pages selected"), variant: "destructive" });
      return;
    }
    setCrawlImporting(true);
    setCrawlProgress({ current: 0, total: selected.length });
    for (let i = 0; i < selected.length; i++) {
      const page = selected[i];
      setCrawlProgress({ current: i + 1, total: selected.length });
      try {
        const scraped = await preScrapeUrl(page.url);
        if (!scraped.trim()) continue;
        const { data: source, error } = await supabase
          .from("knowledge_base" as any)
          .insert({ chatbot_id: chatbotId, name: new URL(page.url).pathname || page.url, type: "txt", source_url: scraped, status: "processing" } as any)
          .select().single();
        if (!error && source) processSource((source as any).id);
      } catch (err: any) {
        console.error("Import error:", err);
      }
    }
    toast({ title: t(`${selected.length} pagine importate`, `${selected.length} pages imported`) });
    setCrawlImporting(false);
    setCrawledPages([]);
    fetchData();
  };

  // --- Inline FAQ (RAG) ---
  const addFaqRow = () => setFaqItems(prev => [...prev, { q: "", a: "" }]);
  const removeFaqRow = (idx: number) => setFaqItems(prev => prev.filter((_, i) => i !== idx));
  const updateFaq = (idx: number, field: "q" | "a", val: string) => {
    setFaqItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };
  const handleSaveFaqs = async () => {
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
    await supabase.from("knowledge_base" as any).update({ status: "processing" } as any).eq("id", source.id);
    fetchData();
    processSource(source.id);
    toast({ title: t("Rielaborazione avviata", "Reprocessing started") });
  };

  // --- Search test ---
  const handleSearchTest = async () => {
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

  const handleTemplateApply = async (promptText: string) => {
    if (!chatbotId) return;
    try {
      const { error } = await supabase
        .from("chatbot_configs")
        .update({ knowledge_base: promptText } as any)
        .eq("id", chatbotId);
      if (error) throw error;
      setSystemPrompt(promptText);
      toast({ title: "✅", description: t("System prompt salvato con successo!", "System prompt saved successfully!") });
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
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

  // ─── Free FAQ helpers ───
  const addFreeFaq = () => {
    if (freeFaqs.length >= MAX_FREE_FAQS) return;
    setFreeFaqs(prev => [...prev, { q: "", a: "" }]);
  };
  const updateFreeFaq = (idx: number, field: "q" | "a", val: string) => {
    setFreeFaqs(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };
  const removeFreeFaq = (idx: number) => {
    setFreeFaqs(prev => prev.filter((_, i) => i !== idx));
  };

  // ═══════════════════════════════════════════════════
  // FREE PLAN VIEW
  // ═══════════════════════════════════════════════════
  if (isFree) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            Knowledge Base
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("Configura le conoscenze del tuo chatbot", "Configure your chatbot's knowledge")}
          </p>
        </div>

        {/* Section A: System Prompt + FAQ */}
        <div className="glass rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("System Prompt / Istruzioni base", "System Prompt / Base Instructions")}
            </h2>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t("Scrivi le istruzioni che il bot seguirà per rispondere", "Write the instructions the bot will follow to respond")}
            </Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => {
                if (e.target.value.length <= MAX_FREE_PROMPT_CHARS) {
                  setSystemPrompt(e.target.value);
                }
              }}
              placeholder={t(
                "Es: Sei l'assistente di [nome azienda]. Rispondi in modo cordiale...",
                "E.g.: You are the assistant of [company name]. Reply in a friendly tone..."
              )}
              rows={8}
              className="bg-secondary border-border resize-none font-mono text-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("Usato come system prompt per il bot", "Used as system prompt for the bot")}</span>
              <span className={systemPrompt.length >= MAX_FREE_PROMPT_CHARS ? "text-destructive" : ""}>
                {systemPrompt.length}/{MAX_FREE_PROMPT_CHARS}
              </span>
            </div>
          </div>

          {/* Free FAQ section */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">FAQ</Label>
              <span className="text-xs text-muted-foreground">{freeFaqs.length}/{MAX_FREE_FAQS}</span>
            </div>

            {freeFaqs.map((faq, idx) => (
              <div key={idx} className="flex gap-2 items-start group">
                <div className="flex-1 space-y-1.5">
                  <Input
                    placeholder={t("Domanda...", "Question...")}
                    value={faq.q}
                    onChange={(e) => updateFreeFaq(idx, "q", e.target.value)}
                    className="bg-secondary border-border text-sm"
                  />
                  <Textarea
                    placeholder={t("Risposta...", "Answer...")}
                    value={faq.a}
                    onChange={(e) => updateFreeFaq(idx, "a", e.target.value)}
                    rows={2}
                    className="bg-secondary border-border text-sm resize-none"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFreeFaq(idx)}
                  className="text-muted-foreground hover:text-destructive mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {freeFaqs.length >= MAX_FREE_FAQS ? (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t(
                  `Limite piano Free: ${MAX_FREE_FAQS} FAQ. Fai upgrade per aggiungere FAQ illimitate.`,
                  `Free plan limit: ${MAX_FREE_FAQS} FAQs. Upgrade for unlimited FAQs.`
                )}
              </p>
            ) : (
              <Button variant="outline" size="sm" onClick={addFreeFaq} className="gap-1.5 border-border text-foreground">
                <Plus className="w-3.5 h-3.5" />
                {t("Aggiungi FAQ", "Add FAQ")}
              </Button>
            )}
          </div>

          <Button onClick={saveKnowledgeBase} disabled={savingPrompt} className="gradient-primary text-white border-0 glow-sm w-full h-11">
            {savingPrompt ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t("Salva", "Save")}
          </Button>
        </div>

        {/* Section B: Template wizard */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wand2 className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("🧙 Wizard Guidato", "🧙 Guided Wizard")}
            </h2>
            <Badge variant="secondary" className="text-xs ml-auto">{t("Gratuito", "Free")}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {t("Configura la knowledge base con il wizard passo-passo",
              "Configure the knowledge base with the step-by-step wizard")}
          </p>
          <IndustryTemplateSelector onApply={handleTemplateApply} />
        </div>

        {/* Section C: RAG locked */}
        <div className="glass rounded-xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-foreground">
                {t("🔒 Ricerca Avanzata (RAG)", "🔒 Advanced Search (RAG)")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(
                  "Carica PDF, Word, analizza il tuo sito web e usa la ricerca semantica. Disponibile dal piano Starter.",
                  "Upload PDF, Word, analyze your website and use semantic search. Available on Starter plan."
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => showUpgrade("starter")} className="shrink-0">
              Upgrade
            </Button>
          </div>
        </div>

        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} requiredPlan={upgradeRequiredPlan} variant="rag" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // STARTER / PRO VIEW — Two-section architecture
  // ═══════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in-up">
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

      {/* Slim RAG active bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/30">
        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        <p className="text-xs text-foreground">
          {t("RAG attivo — il bot usa la ricerca semantica per rispondere con precisione dai tuoi documenti.",
            "RAG active — the bot uses semantic search to answer precisely from your documents.")}
        </p>
      </div>

      {/* Compact stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Database, value: sources.length, label: t("Fonti totali", "Total sources"), iconCls: "text-primary" },
          { icon: CheckCircle2, value: readySources, label: t("Fonti pronte", "Ready sources"), iconCls: "text-success" },
          { icon: FileText, value: totalChunks, label: t("Chunk totali", "Total chunks"), iconCls: "text-primary" },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <stat.icon className={`w-4 h-4 ${stat.iconCls}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Processing banner */}
      {processingSources > 0 && (
        <div className="glass rounded-lg px-3 py-2.5 border-warning/30 flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-warning" />
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">
              {t(`${processingSources} fonte/i in elaborazione...`, `${processingSources} source(s) processing...`)}
            </p>
            <Progress value={undefined} className="mt-1.5 h-1" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* SECTION 1 — Istruzioni del Bot (System Prompt)   */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>1️⃣</span> {t("Istruzioni del Bot", "Bot Instructions")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("Definisci personalità, tono e conoscenze di base del bot. Usa il Wizard guidato oppure scrivi direttamente il prompt.",
              "Define personality, tone, and base knowledge. Use the guided Wizard or write the prompt directly.")}
          </p>
        </div>

        <Tabs defaultValue="wizard" className="space-y-3">
          <TabsList className="h-9 w-auto inline-flex bg-muted/50">
            <TabsTrigger value="wizard" className="gap-1.5 text-xs px-3 h-7">
              <Sparkles className="w-3.5 h-3.5" /> {t("Wizard guidato", "Guided Wizard")}
            </TabsTrigger>
            <TabsTrigger value="prompt" className="gap-1.5 text-xs px-3 h-7">
              <PenLine className="w-3.5 h-3.5" /> {t("Scrivi prompt", "Write prompt")}
            </TabsTrigger>
          </TabsList>

          {/* Amber hint banner */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30">
            <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80">
              {t("Wizard e Prompt modificano le stesse istruzioni — usane uno solo. Il Wizard è consigliato per iniziare, il Prompt per personalizzazioni avanzate.",
                "Wizard and Prompt modify the same instructions — use only one. The Wizard is recommended for getting started, the Prompt for advanced customization.")}
            </p>
          </div>

          {/* WIZARD SUB-TAB */}
          <TabsContent value="wizard">
            <div className="glass rounded-xl p-5">
              <IndustryTemplateSelector onApply={handleTemplateApply} />
            </div>
          </TabsContent>

          {/* PROMPT SUB-TAB */}
          <TabsContent value="prompt">
            <div className="glass rounded-xl p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("System Prompt / Istruzioni", "System Prompt / Instructions")}</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={t(
                    "Es: Sei l'assistente di [nome azienda]. Rispondi in modo cordiale...",
                    "E.g.: You are the assistant of [company name]. Reply in a friendly tone..."
                  )}
                  rows={12}
                  className="bg-secondary border-border resize-none font-mono text-sm"
                />
              </div>

              {/* Inline FAQ manager (unlimited for paid) */}
              <div className="border-t border-border pt-4 space-y-3">
                <Label className="text-sm font-medium">FAQ</Label>
                {freeFaqs.map((faq, idx) => (
                  <div key={idx} className="flex gap-2 items-start group">
                    <div className="flex-1 space-y-1.5">
                      <Input
                        placeholder={t("Domanda...", "Question...")}
                        value={faq.q}
                        onChange={(e) => updateFreeFaq(idx, "q", e.target.value)}
                        className="bg-secondary border-border text-sm"
                      />
                      <Textarea
                        placeholder={t("Risposta...", "Answer...")}
                        value={faq.a}
                        onChange={(e) => updateFreeFaq(idx, "a", e.target.value)}
                        rows={2}
                        className="bg-secondary border-border text-sm resize-none"
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFreeFaq(idx)}
                      className="text-muted-foreground hover:text-destructive mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addFreeFaq} className="gap-1.5 border-border text-foreground">
                  <Plus className="w-3.5 h-3.5" />
                  {t("Aggiungi FAQ", "Add FAQ")}
                </Button>
              </div>

              <Button onClick={saveKnowledgeBase} disabled={savingPrompt} className="gradient-primary text-white border-0 glow-sm w-full h-11">
                {savingPrompt ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {t("Salva Knowledge Base", "Save Knowledge Base")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Visual divider */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 border-t border-border" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowDown className="w-3.5 h-3.5" />
          <span>{t("combinato con", "combined with")}</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECTION 2 — Documenti & Ricerca Semantica (RAG)  */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>2️⃣</span> {t("Documenti & Ricerca Semantica", "Documents & Semantic Search")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("Carica documenti, analizza il tuo sito o gestisci le fonti. Tutti si sommano: più fonti aggiungi, più il bot è preciso.",
              "Upload documents, analyze your site, or manage sources. They all stack: more sources = more accurate bot.")}
          </p>
        </div>

        <Tabs defaultValue="documents" className="space-y-3">
          <TabsList className="h-9 w-auto inline-flex bg-muted/50">
            <TabsTrigger value="documents" className="gap-1.5 text-xs px-3 h-7">
              <Upload className="w-3.5 h-3.5" /> {t("Documenti", "Documents")}
            </TabsTrigger>
            <TabsTrigger value="web" className="gap-1.5 text-xs px-3 h-7">
              <Globe className="w-3.5 h-3.5" /> {t("Sito Web", "Website")}
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5 text-xs px-3 h-7">
              <Database className="w-3.5 h-3.5" /> {t("Fonti", "Sources")}
            </TabsTrigger>
          </TabsList>

          {/* Blue info banner */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80">
              {t("Documenti, Sito Web e Fonti si combinano automaticamente. Puoi usarli tutti insieme — il bot cercherà in tutte le fonti.",
                "Documents, Website, and Sources combine automatically. You can use them all together — the bot will search across all sources.")}
            </p>
          </div>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents">
            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                {t("Carica Documenti", "Upload Documents")}
              </h3>

              {/* File drop zone */}
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
                      PDF, DOCX, TXT, MD, CSV, XLSX · Max 50MB
                    </p>
                  </div>
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </div>


              <div className="border-t border-border pt-4 space-y-3">
                <Label className="text-sm font-medium">{t("FAQ (RAG)", "FAQ (RAG)")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("Queste FAQ vengono elaborate come fonti RAG con embedding vettoriali.",
                    "These FAQs are processed as RAG sources with vector embeddings.")}
                </p>
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
                {faqLimitReached && (
                  <p className="text-xs text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t(`Limite di ${maxFaqs} FAQ raggiunto.`, `Limit of ${maxFaqs} FAQs reached.`)}
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
              </div>

              {/* Free text */}
              <div className="border-t border-border pt-4 space-y-3">
                <Label className="text-sm font-medium">{t("Testo Libero (RAG)", "Free Text (RAG)")}</Label>
                <Input
                  placeholder={t("Nome (opzionale)", "Name (optional)")}
                  value={freeTextName}
                  onChange={(e) => setFreeTextName(e.target.value)}
                  className="bg-secondary border-border text-sm"
                />
                <Textarea
                  placeholder={t("Incolla qui il testo...", "Paste text here...")}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  rows={6}
                  className="bg-secondary border-border text-sm resize-none"
                />
                <Button onClick={handleAddFreeText} disabled={uploading || !freeText.trim()} className="w-full gap-1.5">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {t("Aggiungi testo", "Add text")}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* WEB TAB */}
          <TabsContent value="web">
            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                {t("Importa dal Sito Web", "Import from Website")}
              </h3>

              {/* 3-mode toggle */}
              <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
                {([
                  { key: "single" as const, icon: "📄", label: t("Pagina singola", "Single page") },
                  { key: "crawl" as const, icon: "🕷️", label: t("Scansiona sito", "Scan site") },
                  { key: "sitemap" as const, icon: "🗺️", label: t("Sitemap XML", "Sitemap XML") },
                ]).map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setWebMode(mode.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      webMode === mode.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode.icon} {mode.label}
                  </button>
                ))}
              </div>

              {/* MODE 1: Pagina singola */}
              {webMode === "single" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("URL della pagina da importare", "URL of the page to import")}</Label>
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
                </div>
              )}

              {/* MODE 2: Scansiona sito */}
              {webMode === "crawl" && (
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">{t("URL del sito da analizzare", "Website URL to analyze")}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com"
                      value={crawlerUrl}
                      onChange={(e) => setCrawlerUrl(e.target.value)}
                      className="bg-secondary border-border text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyzeSite()}
                    />
                    <Button onClick={handleAnalyzeSite} disabled={analyzing || !crawlerUrl.trim()} className="gap-1.5 shrink-0">
                      {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {t("Analizza sito", "Analyze site")}
                    </Button>
                  </div>

                  {/* Crawled pages checklist */}
                  {crawledPages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">
                          {t(`${crawledPages.length} pagine trovate`, `${crawledPages.length} pages found`)}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => selectAllCrawl(true)} className="text-[11px] text-primary hover:underline">
                            {t("Seleziona tutto", "Select all")}
                          </button>
                          <button onClick={() => selectAllCrawl(false)} className="text-[11px] text-muted-foreground hover:underline">
                            {t("Deseleziona tutto", "Deselect all")}
                          </button>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                        {crawledPages.map((page, i) => (
                          <label
                            key={i}
                            className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                              page.selected ? "bg-primary/10" : "hover:bg-accent/50"
                            } ${crawlImporting ? "opacity-60 pointer-events-none" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={page.selected}
                              onChange={() => toggleCrawlPage(i)}
                              className="rounded border-border"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground truncate">{page.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{page.url}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                      {crawlImporting && (
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          {t(`Importando ${crawlProgress.current}/${crawlProgress.total}...`, `Importing ${crawlProgress.current}/${crawlProgress.total}...`)}
                        </div>
                      )}

                      <Button
                        onClick={handleImportCrawledPages}
                        disabled={crawlImporting || !crawledPages.some(p => p.selected)}
                        className="w-full gap-1.5"
                      >
                        {crawlImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {t("Importa selezionate", "Import selected")}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 3: Sitemap XML */}
              {webMode === "sitemap" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("URL della sitemap XML (importa fino a 50 pagine)", "XML Sitemap URL (imports up to 50 pages)")}</Label>
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
                  <p className="text-[11px] text-muted-foreground">
                    {t("💡 Non sai dove trovare la sitemap? Prova https://tuosito.com/sitemap.xml",
                      "💡 Don't know where to find the sitemap? Try https://yoursite.com/sitemap.xml")}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* SOURCES TAB */}
          <TabsContent value="sources">
            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                {t("Fonti caricate", "Uploaded sources")}
                <Badge variant="outline" className="ml-auto text-xs">{sources.length}</Badge>
              </h3>

              {sources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="w-10 h-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("Nessuna fonte aggiunta", "No sources added")}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
                    {t("Usa le tab Documenti o Sito Web per aggiungere fonti.",
                      "Use the Documents or Website tabs to add sources.")}
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
            <div className="glass rounded-xl p-5 mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                {t("Test Ricerca Semantica", "Semantic Search Test")}
              </h3>
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
          </TabsContent>
        </Tabs>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} requiredPlan={upgradeRequiredPlan} variant="rag" />
    </div>
  );
};

export default ClientRAGKnowledgeBase;
