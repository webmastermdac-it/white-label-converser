import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Upload, Globe, HelpCircle, FileText, Trash2,
  RefreshCw, CheckCircle2, XCircle, Clock, Plus, Database,
  Search, Map, Send, AlertTriangle, GripVertical, X, Lock,
  Save, Star, Info, Store, ExternalLink, BookOpen,
} from "lucide-react";

// ── Types ──
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
  priority?: number;
}

interface FaqEntry {
  id?: string;
  question: string;
  answer: string;
}

const normalizeUrl = (url: string): string => {
  try {
    const u = new URL(url.trim().toLowerCase());
    u.hash = "";
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    let normalized = u.toString();
    if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
    return normalized;
  } catch {
    return url.trim().toLowerCase();
  }
};

const statusConfig: Record<string, { icon: any; cls: string; label: string }> = {
  processing: { icon: Clock, cls: "bg-warning/10 text-warning border-warning/30", label: "Processing..." },
  ready: { icon: CheckCircle2, cls: "bg-success/10 text-success border-success/30", label: "Ready" },
  error: { icon: XCircle, cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Error" },
  outdated: { icon: RefreshCw, cls: "bg-primary/10 text-primary border-primary/30", label: "Outdated" },
};

// ── E-commerce KB Status inline component ──
const EcommerceKBStatus: React.FC<{ clientId: string }> = ({ clientId }) => {
  const [config, setConfig] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const { lang } = useLanguage();
  const t = (it: string, en: string) => lang === "it" ? it : en;

  useEffect(() => {
    supabase
      .from("ecommerce_configs" as any)
      .select("platform, sync_status, last_sync_at")
      .eq("client_id", clientId)
      .maybeSingle()
      .then(({ data }) => setConfig(data));
  }, [clientId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke("sync-products", { body: { client_id: clientId } });
      toast({ title: t("Sincronizzazione avviata", "Sync started") });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (!config) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
        <Store className="w-4 h-4" />
        {t("Nessuna integrazione configurata.", "No integration configured.")}
        <button
          className="ml-auto text-primary underline"
          onClick={() => window.location.href = "/dashboard/ecommerce"}
        >
          {t("Configura ora →", "Configure now →")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
      <Store className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground capitalize">{config.platform}</p>
        <p className="text-[10px] text-muted-foreground">
          {config.last_sync_at ? `${t("Sync", "Sync")}: ${new Date(config.last_sync_at).toLocaleDateString()}` : ""}
        </p>
      </div>
      <Badge variant={config.sync_status === "success" ? "default" : "destructive"} className="text-[10px]">
        {config.sync_status}
      </Badge>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
};

const LockedProFeature = ({ title, description, onUpgrade }: {
  title: string;
  description: string;
  onUpgrade: () => void;
}) => (
  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Pro</Badge>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
    <Button variant="outline" size="sm" onClick={onUpgrade} className="shrink-0">
      Upgrade
    </Button>
  </div>
);

const ClientRAGKnowledgeBase = ({ overrideClientId, overrideChatbotId, section }: { overrideClientId?: string; overrideChatbotId?: string; section?: "faq" | "knowledge" | "instructions" } = {}) => {
  const { clientId: authClientId, role } = useAuth();
  const clientId = overrideClientId || authClientId;
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { canUploadDocs, maxFaqs, canUseEcommerce, config: planConfig } = usePlanConfig();
  const maxDocuments = (planConfig as any)?.max_documents ?? -1;
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeRequiredPlan, setUpgradeRequiredPlan] = useState<"starter" | "pro">("starter");
  const [upgradeBannerDismissed, setUpgradeBannerDismissed] = useState(false);

  // State
  const [chatbotId, setChatbotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // FAQ state
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [savingFaqs, setSavingFaqs] = useState(false);

  // Knowledge (RAG) state
  const [sources, setSources] = useState<KBSource[]>([]);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [sitemapInput, setSitemapInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webMode, setWebMode] = useState<"single" | "crawl" | "sitemap">("single");
  const [crawlerUrl, setCrawlerUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [crawledPages, setCrawledPages] = useState<{ url: string; title: string; selected: boolean }[]>([]);
  const [crawlImporting, setCrawlImporting] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [freeTextName, setFreeTextName] = useState("");
  const [updatingPriorityId, setUpdatingPriorityId] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<KBSource | null>(null);
  const [kbTab, setKbTab] = useState<"sources" | "upload" | "web" | "text">("sources");
  const [previewChunks, setPreviewChunks] = useState<{content: string; chunk_index: number; token_count: number}[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Instructions state
  const [systemPrompt, setSystemPrompt] = useState("");
  const systemPromptRef = useRef("");
  const [chatbotVertical, setChatbotVertical] = useState<string | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [activeArea, setActiveArea] = useState<"hub" | "faq" | "knowledge" | "instructions">("hub");

  const t = (it: string, en: string) => lang === "it" ? it : en;
  const isFree = planConfig?.plan_name === "free";
  const isAdmin = role === "super_admin";

  const showUpgrade = (plan: "starter" | "pro" = "starter") => {
    setUpgradeRequiredPlan(plan);
    setUpgradeOpen(true);
  };

  // ── Fetch all data ──
  const fetchData = useCallback(async () => {
    if (!clientId && !overrideChatbotId) return;
    
    let configId = overrideChatbotId;
    let promptValue = "";
    
    let loaded: any = null;
    if (overrideChatbotId) {
      const { data: config } = await supabase
        .from("chatbot_configs")
        .select("id, knowledge_base, business_vertical")
        .eq("id", overrideChatbotId)
        .single();
      if (!config) { setLoading(false); return; }
      loaded = config;
    } else {
      const { data: config } = await supabase
        .from("chatbot_configs")
        .select("*")
        .eq("client_id", clientId!)
        .limit(1)
        .single();
      if (!config) { setLoading(false); return; }
      loaded = config;
    }
    configId = loaded.id;
    promptValue = loaded.knowledge_base || "";
    setChatbotVertical(loaded.business_vertical ?? null);
    
    setChatbotId(configId!);
    setSystemPrompt(promptValue);
    systemPromptRef.current = promptValue;

    // Staleness watchdog: auto-mark stuck "processing" sources as error
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from("knowledge_base" as any)
      .update({ status: "error", error_message: "Timeout: elaborazione troppo lunga. Riprova." } as any)
      .eq("chatbot_id", configId!)
      .eq("status", "processing")
      .lt("updated_at", staleThreshold);

    // Fetch FAQs from dedicated table
    const { data: faqData } = await supabase
      .from("faqs" as any)
      .select("id, question, answer")
      .eq("chatbot_id", configId!)
      .order("created_at", { ascending: true });
    setFaqs((faqData as any as FaqEntry[]) || []);

    // Fetch RAG sources
    const { data: sourcesData } = await supabase
      .from("knowledge_base" as any)
      .select("*")
      .eq("chatbot_id", configId!)
      .order("created_at", { ascending: false });
    setSources((sourcesData as any as KBSource[]) || []);
    setLoading(false);
  }, [clientId, overrideChatbotId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const hasProcessing = sources.some(s => s.status === "processing");
    if (!hasProcessing) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [sources, fetchData]);

  // ══════════════════════════════════════════════════════
  // SECTION 1 — FAQ Management
  // ══════════════════════════════════════════════════════
  const addFaqEntry = () => {
    if (maxFaqs !== -1 && faqs.length >= maxFaqs) {
      showUpgrade("starter");
      return;
    }
    setFaqs(prev => [...prev, { question: "", answer: "" }]);
  };

  const updateFaqEntry = (idx: number, field: "question" | "answer", val: string) => {
    setFaqs(prev => prev.map((f, i) => i === idx ? { ...f, [field]: val } : f));
  };

  const removeFaqEntry = async (idx: number) => {
    const faq = faqs[idx];
    if (faq.id) {
      await supabase.from("faqs" as any).delete().eq("id", faq.id);
    }
    setFaqs(prev => prev.filter((_, i) => i !== idx));
  };

  const saveFaqs = async () => {
    if (!chatbotId) return;
    setSavingFaqs(true);
    try {
      const validFaqs = faqs.filter(f => f.question.trim() && f.answer.trim());
      const toUpdate = validFaqs.filter(f => f.id);
      const toInsert = validFaqs.filter(f => !f.id);
      for (const f of toUpdate) {
        await supabase.from("faqs" as any).update({ question: f.question, answer: f.answer }).eq("id", f.id);
      }
      if (toInsert.length > 0) {
        const { error } = await supabase.from("faqs" as any).insert(
          toInsert.map(f => ({ chatbot_id: chatbotId, question: f.question, answer: f.answer }))
        );
        if (error) throw error;
      }
      toast({ title: "✅", description: t("FAQ salvate!", "FAQs saved!") });
      fetchData();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setSavingFaqs(false);
  };

  // ══════════════════════════════════════════════════════
  // SECTION 2 — Knowledge Base (RAG)
  // ══════════════════════════════════════════════════════
  const processSource = async (sourceId: string) => {
    try {
      await supabase.functions.invoke("process-knowledge", {
        body: { knowledge_base_id: sourceId },
      });
    } catch (err) {
      console.error("Process error:", err);
    }
  };

  const docCount = sources.filter(s => s.type !== "faq").length;
  const docLimitReached = maxDocuments !== -1 && docCount >= maxDocuments;

  const uploadFiles = async (files: FileList | File[]) => {
    if (!chatbotId) return;
    if (docLimitReached) { showUpgrade("pro"); return; }
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
          .select().single();
        if (insertErr) throw insertErr;
        processSource((source as any).id);
      } catch (err: any) {
        toast({ title: `${file.name}: ${err.message}`, variant: "destructive" });
      }
    }
    toast({ title: t(`${valid.length} file caricati`, `${valid.length} files uploaded`) });
    setUploading(false);
    setKbTab("sources");
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

  const handleAddUrl = async () => {
    if (!urlInput.trim() || !chatbotId) return;
    if (docLimitReached) { showUpgrade("pro"); return; }
    setUploading(true);
    try {
      const formattedUrl = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
      const normalized = normalizeUrl(formattedUrl);

      const { data: existing } = await supabase
        .from("knowledge_base")
        .select("id, status, name")
        .eq("chatbot_id", chatbotId)
        .eq("source_url", normalized)
        .maybeSingle();

      if (existing) {
        toast({
          title: t("URL già presente", "URL already exists"),
          description: t(
            `"${existing.name}" è già nella Knowledge Base (stato: ${existing.status}). Usa il tasto Rielabora se vuoi aggiornarlo.`,
            `"${existing.name}" is already in the Knowledge Base (status: ${existing.status}). Use Reprocess to update it.`
          ),
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke("scrape-website", {
        body: { url: normalized, mode: "analyze" },
      });
      if (scrapeErr || !scrapeData?.content?.trim()) {
        toast({
          title: t("Impossibile leggere il sito", "Cannot read website"),
          description: t(
            "Il sito potrebbe avere protezioni anti-bot. Prova a copiare il testo manualmente nel tab 'Testo'.",
            "The site may have anti-bot protection. Try copying text manually in the 'Text' tab."
          ),
          variant: "destructive",
        });
        setUploading(false);
        return;
      }
      const { data: source, error } = await supabase
        .from("knowledge_base" as any)
        .insert({ chatbot_id: chatbotId, name: new URL(normalized).hostname + new URL(normalized).pathname, type: "txt", source_url: normalized, page_url: urlInput.trim() ? normalized : null, status: "processing" } as any)
        .select().single();
      if (error) throw error;
      await supabase.from("knowledge_base" as any).update({ source_url: scrapeData.content } as any).eq("id", (source as any).id);
      setUrlInput("");
      processSource((source as any).id);
      toast({ title: t("URL aggiunto", "URL added") });
      fetchData();
      setKbTab("sources");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleAddSitemap = async () => {
    if (!sitemapInput.trim() || !chatbotId) return;
    if (isFree) { showUpgrade("starter"); return; }
    setUploading(true);
    try {
      const sitemapUrl = sitemapInput.startsWith("http") ? sitemapInput : `https://${sitemapInput}`;
      const res = await fetch(sitemapUrl);
      const text = await res.text();
      const urlMatches = text.match(/<loc>(.*?)<\/loc>/g) || [];
      const urls = urlMatches.map(m => normalizeUrl(m.replace(/<\/?loc>/g, ""))).slice(0, 50);
      if (!urls.length) {
        toast({ title: t("Nessun URL trovato nella sitemap", "No URLs found in sitemap"), variant: "destructive" });
        setUploading(false);
        return;
      }

      const { data: existingSources } = await supabase
        .from("knowledge_base")
        .select("source_url")
        .eq("chatbot_id", chatbotId);
      const existingUrls = new Set((existingSources || []).map((s: any) => normalizeUrl(s.source_url || "")));
      const newUrls = urls.filter(url => !existingUrls.has(url));
      const skippedCount = urls.length - newUrls.length;

      if (!newUrls.length) {
        toast({
          title: t("Tutte le pagine già presenti", "All pages already indexed"),
          description: t(
            `Tutte le ${urls.length} pagine della sitemap sono già nella Knowledge Base.`,
            `All ${urls.length} sitemap pages are already in the Knowledge Base.`
          ),
        });
        setUploading(false);
        return;
      }

      let addedCount = 0;
      for (const url of newUrls) {
        try {
          const { data: scrapeData } = await supabase.functions.invoke("scrape-website", {
            body: { url, mode: "analyze" },
          });
          const content = scrapeData?.content?.trim();
          if (!content) continue;
          const { data: source, error } = await supabase
            .from("knowledge_base" as any)
            .insert({ chatbot_id: chatbotId, name: new URL(url).pathname || url, type: "txt", source_url: content, page_url: url, status: "processing" } as any)
            .select().single();
          if (!error && source) { processSource((source as any).id); addedCount++; }
        } catch { continue; }
      }
      setSitemapInput("");
      toast({
        title: t(`${addedCount} pagine importate`, `${addedCount} pages imported`),
        description: skippedCount > 0
          ? t(`${skippedCount} pagine già presenti ignorate.`, `${skippedCount} already existing pages skipped.`)
          : undefined,
      });
      fetchData();
      setKbTab("sources");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

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
        url: l.url, title: l.title || new URL(l.url).pathname, selected: false,
      }));
      setCrawledPages(links);
      if (!links.length) toast({ title: t("Nessuna pagina trovata", "No pages found"), variant: "destructive" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
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
    if (!selected.length) return;
    setCrawlImporting(true);
    setCrawlProgress({ current: 0, total: selected.length });

    const { data: existingSources } = await supabase
      .from("knowledge_base")
      .select("source_url")
      .eq("chatbot_id", chatbotId);
    const existingUrls = new Set((existingSources || []).map((s: any) => normalizeUrl(s.source_url || "")));

    let addedCount = 0;
    let skippedCount = 0;
    for (let i = 0; i < selected.length; i++) {
      setCrawlProgress({ current: i + 1, total: selected.length });
      const normalized = normalizeUrl(selected[i].url);
      if (existingUrls.has(normalized)) { skippedCount++; continue; }
      try {
        const { data: scrapeData } = await supabase.functions.invoke("scrape-website", {
          body: { url: normalized, mode: "analyze" },
        });
        const content = scrapeData?.content?.trim();
        if (!content) { skippedCount++; continue; }
        const { data: source, error } = await supabase
          .from("knowledge_base" as any)
          .insert({ chatbot_id: chatbotId, name: new URL(normalized).pathname || selected[i].url, type: "txt", source_url: content, page_url: normalized, status: "processing" } as any)
          .select().single();
        if (!error && source) { processSource((source as any).id); addedCount++; existingUrls.add(normalized); }
      } catch { continue; }
    }
    toast({
      title: t(`${addedCount} pagine importate`, `${addedCount} pages imported`),
      description: skippedCount > 0
        ? t(`${skippedCount} pagine già presenti ignorate.`, `${skippedCount} already existing pages skipped.`)
        : undefined,
    });
    setCrawlImporting(false);
    setCrawledPages([]);
    fetchData();
    setKbTab("sources");
  };

  const handleAddFreeText = async () => {
    if (!freeText.trim() || !chatbotId) return;
    if (docLimitReached) { showUpgrade("pro"); return; }
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
      setKbTab("sources");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

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
    await supabase.from("knowledge_base" as any).update({ status: "processing", updated_at: new Date().toISOString() } as any).eq("id", source.id);
    fetchData();
    processSource(source.id);
  };

  const openPreview = async (source: KBSource) => {
    setPreviewSource(source);
    setLoadingPreview(true);
    const { data } = await supabase
      .from("knowledge_chunks" as any)
      .select("content, chunk_index, token_count")
      .eq("knowledge_base_id", source.id)
      .order("chunk_index", { ascending: true });
    setPreviewChunks((data as any) || []);
    setLoadingPreview(false);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Eliminare ${selectedIds.size} fonti selezionate?`)) return;
    setBulkDeleting(true);
    try {
      for (const id of selectedIds) {
        const source = sources.find(s => s.id === id);
        await supabase.from("knowledge_chunks" as any).delete().eq("knowledge_base_id", id);
        if (source?.file_path) await supabase.storage.from("kb-documents").remove([source.file_path]);
        await supabase.from("knowledge_base" as any).delete().eq("id", id);
      }
      toast({ title: `✅ ${selectedIds.size} fonti eliminate` });
      setSelectedIds(new Set());
      fetchData();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSourceSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sources.map(s => s.id)));
    }
  };

  const handleSetPriority = async (sourceId: string, priority: number) => {
    setUpdatingPriorityId(sourceId);
    await supabase.from("knowledge_base" as any).update({ priority } as any).eq("id", sourceId);
    setUpdatingPriorityId(null);
    fetchData();
  };

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
      if (!data?.chunks?.length) toast({ title: t("Nessun risultato trovato", "No results found"), variant: "destructive" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally { setSearching(false); }
  };

  // ── Save Instructions ──
  const saveInstructions = async () => {
    if (!chatbotId) return;
    setSavingPrompt(true);
    try {
      const { error } = await supabase
        .from("chatbot_configs")
        .update({ knowledge_base: systemPromptRef.current } as any)
        .eq("id", chatbotId);
      if (error) throw error;
      toast({ title: "✅", description: t("Istruzioni salvate!", "Instructions saved!") });
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setSavingPrompt(false);
  };

  // ── Stats ──
  const totalChunks = sources.filter(s => s.status === "ready").reduce((sum, s) => sum + s.chunk_count, 0);
  const readySources = sources.filter(s => s.status === "ready").length;
  const processingSources = sources.filter(s => s.status === "processing").length;
  const typeIcons: Record<string, any> = {
    pdf: FileText, docx: FileText, doc: FileText, txt: FileText,
    md: FileText, csv: FileText, xlsx: FileText, url: Globe, faq: HelpCircle,
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  // ══════════════════════════════════════════════════════
  // PRIORITY SECTION CARD COMPONENT
  // ══════════════════════════════════════════════════════
  const PriorityHeader = ({ num, icon, title, subtitle, stars, starLabel }: {
    num: number; icon: React.ReactNode; title: string; subtitle: string; stars: number; starLabel: string;
  }) => (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{num}. {title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-amber-500 shrink-0">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
        ))}
        <span className="ml-1 text-[11px] font-medium text-muted-foreground">{starLabel}</span>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  const showAll = !section;
  const showFaq = showAll ? activeArea === "faq" : section === "faq";
  const showKnowledge = showAll ? activeArea === "knowledge" : section === "knowledge";
  const showInstructions = showAll ? activeArea === "instructions" : section === "instructions";

  const kbHubCards = [
    {
      key: "faq" as const,
      icon: HelpCircle,
      color: "#F59E0B",
      stars: 3,
      title: "FAQ",
      subtitle: t("Risposte esatte a domande specifiche", "Exact answers to specific questions"),
    },
    {
      key: "knowledge" as const,
      icon: BookOpen,
      color: "#3B82F6",
      stars: 2,
      title: t("Documenti", "Documents"),
      subtitle: t("Documenti che il bot cerca quando nessuna FAQ corrisponde", "Documents the bot searches when no FAQ matches"),
    },
    {
      key: "instructions" as const,
      icon: FileText,
      color: "#A855F7",
      stars: 1,
      title: t("Istruzioni", "Instructions"),
      subtitle: t("Testo libero usato come ultima risorsa", "Free text used as a last resort"),
    },
  ];

  return (
    <div className={section ? "space-y-5" : "p-4 md:p-6 space-y-5 animate-fade-in-up"}>
      {/* Header — only when showing full page */}
      {showAll && (
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            Knowledge Base
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t(
              "Gestisci le fonti di conoscenza del tuo chatbot. Le risposte seguono un ordine di priorità: FAQ → Documenti → Istruzioni.",
              "Manage your chatbot's knowledge sources. Responses follow a priority order: FAQ → Knowledge → Instructions."
            )}
          </p>
        </div>
      )}

      {isFree && !isAdmin && !upgradeBannerDismissed && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
          <Lock className="h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-xs font-medium text-foreground">
            {t(
              "3 funzionalità avanzate disponibili con Pro — Documenti, Ricerca Avanzata, Ecommerce e Catalogo",
              "3 advanced features available with Pro — Documents, Advanced Search, Ecommerce & Catalog"
            )}
          </p>
          <Button variant="outline" size="sm" onClick={() => showUpgrade("pro")} className="h-7 shrink-0 text-xs">
            {t("Passa a Pro", "Upgrade to Pro")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setUpgradeBannerDismissed(true)}
            aria-label={t("Chiudi", "Dismiss")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Processing banner */}
      {showKnowledge && processingSources > 0 && (
        <div className="glass rounded-lg px-3 py-2.5 border-warning/30 flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-warning" />
          <p className="text-xs font-medium text-foreground">
            {t(`${processingSources} fonte/i in elaborazione...`, `${processingSources} source(s) processing...`)}
          </p>
        </div>
      )}

      {/* Hub — area selection when rendered without a section */}
      {showAll && activeArea === "hub" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kbHubCards.map((card) => (
            <button
              key={card.key}
              onClick={() => setActiveArea(card.key)}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all text-center"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${card.color}22` }}
              >
                <card.icon className="w-7 h-7" style={{ color: card.color }} />
              </div>
              <span className="text-base font-semibold text-foreground">{card.title}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: card.stars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </button>
          ))}
        </div>
      )}

      {showAll && activeArea !== "hub" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveArea("hub")}
          className="gap-2 self-start text-muted-foreground hover:text-foreground"
        >
          ← {t("Torna alla Conoscenza", "Back to Knowledge")}
        </Button>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* SECTION 1 — FAQ (Priority: HIGH ★★★)             */}
      {/* ══════════════════════════════════════════════════ */}
      {showFaq && (
      <div className="glass rounded-xl p-5">
        <PriorityHeader
          num={1}
          icon="📋"
          title="FAQ"
          subtitle={t(
            "Risposte esatte a domande specifiche — vengono sempre usate per prime",
            "Exact answers to specific questions — always used first"
          )}
          stars={3}
          starLabel={t("Priorità alta", "High priority")}
        />

        {faqs.map((faq, idx) => (
          <div key={idx} className="flex gap-2 items-start group mb-3">
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder={t("Domanda...", "Question...")}
                value={faq.question}
                onChange={(e) => updateFaqEntry(idx, "question", e.target.value)}
                className="bg-secondary border-border text-sm"
              />
              <Textarea
                placeholder={t("Risposta...", "Answer...")}
                value={faq.answer}
                onChange={(e) => updateFaqEntry(idx, "answer", e.target.value)}
                rows={2}
                className="bg-secondary border-border text-sm resize-none"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeFaqEntry(idx)}
              className="text-muted-foreground hover:text-destructive mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {maxFaqs !== -1 && faqs.length >= maxFaqs ? (
          <div className="mb-3">
            <LockedProFeature
              title={t(`Limite di ${maxFaqs} FAQ raggiunto`, `${maxFaqs} FAQ limit reached`)}
              description={t("Più FAQ disponibili con il piano Pro", "More FAQs available on Pro plan")}
              onUpgrade={() => showUpgrade("pro")}
            />
          </div>
        ) : null}

        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={addFaqEntry} className="gap-1.5 border-border text-foreground">
            {maxFaqs !== -1 && faqs.length >= maxFaqs
              ? <><Lock className="w-3.5 h-3.5" /> Upgrade</>
              : <><Plus className="w-3.5 h-3.5" /> {t("Aggiungi FAQ", "Add FAQ")}</>
            }
          </Button>
          <Button size="sm" onClick={saveFaqs} disabled={savingFaqs} className="gap-1.5 ml-auto gradient-primary text-white border-0">
            {savingFaqs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {t("Salva FAQ", "Save FAQs")}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
          <Info className="w-3 h-3 shrink-0" />
          {t("Le FAQ vengono cercate per prime — se la domanda corrisponde, il bot risponde immediatamente senza usare l'AI.",
            "FAQs are searched first — if the question matches, the bot responds immediately without using AI.")}
        </p>
      </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* SECTION 2 — Knowledge Base (Priority: MEDIUM ★★)  */}
      {/* ══════════════════════════════════════════════════ */}
      {showKnowledge && (
      <div className="glass rounded-xl p-5">
        <PriorityHeader
          num={2}
          icon="📚"
          title={t("Documenti", "Documents")}
          subtitle={t(
            "Documenti che il bot cerca quando nessuna FAQ corrisponde",
            "Documents the bot searches when no FAQ matches"
          )}
          stars={2}
          starLabel={t("Priorità media", "Medium priority")}
        />

        {isFree || !canUploadDocs ? (
          <div className="space-y-2">
            <LockedProFeature
              title={t("Caricamento documenti e PDF", "Document and PDF upload")}
              description={t("Disponibile con il piano Pro", "Available on Pro plan")}
              onUpgrade={() => showUpgrade("pro")}
            />
            <LockedProFeature
              title={t("Fonti RAG e Ricerca Avanzata", "RAG sources and Advanced Search")}
              description={t("Disponibile con il piano Pro", "Available on Pro plan")}
              onUpgrade={() => showUpgrade("pro")}
            />
            {chatbotVertical === "ecommerce" && (
              <LockedProFeature
                title={t("🛒 Product Catalog", "🛒 Catalogo Prodotti")}
                description={t("Disponibile con il piano Pro", "Available on Pro plan")}
                onUpgrade={() => showUpgrade("pro")}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Database, value: sources.length, label: t("Fonti", "Sources"), iconCls: "text-primary" },
                { icon: CheckCircle2, value: readySources, label: t("Pronte", "Ready"), iconCls: "text-success" },
                { icon: FileText, value: totalChunks, label: "Chunks", iconCls: "text-primary" },
              ].map((stat, i) => (
                <div key={i} className="rounded-lg bg-secondary/50 px-3 py-2 flex items-center gap-2">
                  <stat.icon className={`w-4 h-4 ${stat.iconCls}`} />
                  <span className="text-sm font-bold text-foreground">{stat.value}</span>
                  <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>

            {docLimitReached && (
              <LockedProFeature
                title={t(`Limite di ${maxDocuments} documenti raggiunto`, `${maxDocuments} document limit reached`)}
                description={t("Più documenti disponibili con il piano Pro", "More documents available on Pro plan")}
                onUpgrade={() => showUpgrade("pro")}
              />
            )}

            <Tabs value={kbTab} onValueChange={(v) => setKbTab(v as any)} className="space-y-3">
              <div className="flex items-center justify-between">
                {kbTab === "sources" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> {t("Aggiungi contenuto", "Add content")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setKbTab("upload")}>📄 {t("Carica file", "Upload file")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setKbTab("web")}>🌐 {t("Sito Web", "Website")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setKbTab("text")}>✏️ {t("Testo", "Text")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setKbTab("sources")} className="gap-1.5">
                      ← {t("Torna alle fonti", "Back to sources")}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {kbTab === "upload"
                        ? t("Carica file", "Upload file")
                        : kbTab === "web"
                        ? t("Sito Web", "Website")
                        : t("Testo", "Text")}
                    </span>
                  </div>
                )}
              </div>

              {/* UPLOAD TAB */}
              <TabsContent value="upload">
                <div
                  ref={dropRef}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                    ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-accent/30"}`}
                >
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx" className="hidden" onChange={handleFileInput} />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Upload className={`w-6 h-6 ${dragging ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t("Trascina i file qui o clicca", "Drag files here or click")}</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD, CSV, XLSX · Max 50MB</p>
                    </div>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* WEB TAB */}
              <TabsContent value="web">
                <div className="space-y-3">
                  <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
                    {([
                      { key: "single" as const, icon: "📄", label: t("Pagina singola", "Single page") },
                      { key: "crawl" as const, icon: "🕷️", label: t("Scansiona sito", "Scan site") },
                      { key: "sitemap" as const, icon: "🗺️", label: "Sitemap XML" },
                    ]).map(mode => (
                      <button key={mode.key} onClick={() => setWebMode(mode.key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          webMode === mode.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}>
                        {mode.icon} {mode.label}
                      </button>
                    ))}
                  </div>

                  {webMode === "single" && (
                    <div className="flex gap-2">
                      <Input placeholder="https://example.com/page" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                        className="bg-secondary border-border text-sm" onKeyDown={(e) => e.key === "Enter" && handleAddUrl()} />
                      <Button onClick={handleAddUrl} disabled={uploading || !urlInput.trim()} className="gap-1.5 shrink-0">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                        {t("Importa", "Import")}
                      </Button>
                    </div>
                  )}

                  {webMode === "crawl" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input placeholder="https://example.com" value={crawlerUrl} onChange={(e) => setCrawlerUrl(e.target.value)}
                          className="bg-secondary border-border text-sm" onKeyDown={(e) => e.key === "Enter" && handleAnalyzeSite()} />
                        <Button onClick={handleAnalyzeSite} disabled={analyzing || !crawlerUrl.trim()} className="gap-1.5 shrink-0">
                          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          {t("Analizza", "Analyze")}
                        </Button>
                      </div>
                      {crawledPages.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-foreground">{crawledPages.length} {t("pagine trovate", "pages found")}</p>
                            <div className="flex gap-2">
                              <button onClick={() => selectAllCrawl(true)} className="text-[11px] text-primary hover:underline">{t("Seleziona tutto", "Select all")}</button>
                              <button onClick={() => selectAllCrawl(false)} className="text-[11px] text-muted-foreground hover:underline">{t("Deseleziona", "Deselect")}</button>
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                            {crawledPages.map((page, i) => (
                              <label key={i} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${page.selected ? "bg-primary/10" : "hover:bg-accent/50"}`}>
                                <input type="checkbox" checked={page.selected} onChange={() => toggleCrawlPage(i)} className="rounded border-border" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-foreground truncate">{page.title}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{page.url}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                          {crawlImporting && (
                            <p className="text-xs text-foreground flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                              {crawlProgress.current}/{crawlProgress.total}...
                            </p>
                          )}
                          <Button onClick={handleImportCrawledPages} disabled={crawlImporting || !crawledPages.some(p => p.selected)} className="w-full gap-1.5">
                            {crawlImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {t("Importa selezionate", "Import selected")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {webMode === "sitemap" && (
                    <div className="flex gap-2">
                      <Input placeholder="https://example.com/sitemap.xml" value={sitemapInput} onChange={(e) => setSitemapInput(e.target.value)}
                        className="bg-secondary border-border text-sm" onKeyDown={(e) => e.key === "Enter" && handleAddSitemap()} />
                      <Button onClick={handleAddSitemap} disabled={uploading || !sitemapInput.trim()} className="gap-1.5 shrink-0">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Map className="w-4 h-4" />}
                        {t("Importa", "Import")}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TEXT TAB */}
              <TabsContent value="text">
                <div className="space-y-3">
                  <Input placeholder={t("Nome (opzionale)", "Name (optional)")} value={freeTextName}
                    onChange={(e) => setFreeTextName(e.target.value)} className="bg-secondary border-border text-sm" />
                  <Textarea placeholder={t("Incolla qui il testo...", "Paste text here...")} value={freeText}
                    onChange={(e) => setFreeText(e.target.value)} rows={6} className="bg-secondary border-border text-sm resize-none" />
                  <Button onClick={handleAddFreeText} disabled={uploading || !freeText.trim()} className="w-full gap-1.5">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {t("Aggiungi testo", "Add text")}
                  </Button>
                </div>
              </TabsContent>

              {/* SOURCES TAB */}
              <TabsContent value="sources">
                <div className="space-y-3">
                  {sources.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Database className="w-10 h-10 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">{t("Nessuna fonte aggiunta", "No sources added")}</p>
                    </div>
                  ) : (
                    <>
                      {/* Bulk toolbar */}
                      <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedIds.size === sources.length && sources.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-xs text-muted-foreground">{t("Seleziona tutti", "Select all")}</span>
                        </label>
                        {selectedIds.size > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{selectedIds.size} {t("selezionate", "selected")}</span>
                            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-1.5 h-7 text-xs">
                              {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              {t("Elimina selezionate", "Delete selected")}
                            </Button>
                          </div>
                        )}
                      </div>
                      {sources.map(source => {
                        const status = statusConfig[source.status] || statusConfig.error;
                        const StatusIcon = status.icon;
                        const TypeIcon = typeIcons[source.type] || FileText;
                        return (
                          <div key={source.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                            <Checkbox
                              checked={selectedIds.has(source.id)}
                              onCheckedChange={() => toggleSourceSelection(source.id)}
                              className="shrink-0"
                            />
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <TypeIcon className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div
                              className="flex-1 min-w-0 cursor-pointer rounded-md -mx-1 px-1 py-0.5 transition-colors hover:bg-muted/40"
                              onClick={() => openPreview(source)}
                            >
                              <p className="text-sm font-medium text-foreground truncate">{source.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0">{source.type}</Badge>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.cls}`}>
                                  <StatusIcon className="w-2.5 h-2.5 mr-0.5" />{status.label}
                                </Badge>
                                {source.status === "ready" && <span className="text-[10px] text-muted-foreground">{source.chunk_count} chunks</span>}
                              </div>
                              {source.error_message && (
                                <p className="text-[11px] text-destructive mt-0.5 flex items-center gap-1" title={source.error_message}>
                                  <AlertTriangle className="w-3 h-3 shrink-0" /> {source.error_message.length > 60 ? source.error_message.slice(0, 60) + "…" : source.error_message}
                                </p>
                              )}
                            </div>
                            {/* Priority stars */}
                            <div className="flex items-center gap-0.5" title={t("Priorità", "Priority")}>
                              {[1, 2, 3].map((star) => (
                                <button
                                  key={star}
                                  onClick={(e) => { e.stopPropagation(); handleSetPriority(source.id, star); }}
                                  disabled={updatingPriorityId === source.id}
                                  className="transition-colors"
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${
                                      star <= (source.priority ?? 2)
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-muted-foreground/30"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {["error", "ready", "outdated"].includes(source.status) && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleReprocess(source); }}>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(source); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Source preview dialog */}
                  <Dialog open={!!previewSource} onOpenChange={(o) => !o && setPreviewSource(null)}>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="truncate pr-6">{previewSource?.name}</DialogTitle>
                      </DialogHeader>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0">{previewSource?.type}</Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${previewSource ? (statusConfig[previewSource.status] || statusConfig.error).cls : ""}`}>
                          {previewSource ? (statusConfig[previewSource.status] || statusConfig.error).label : ""}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{previewSource?.chunk_count ?? 0} chunks</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {previewSource ? new Date(previewSource.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                      {previewSource?.status === "error" ? (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap">
                            {previewSource.error_message || t("Errore sconosciuto", "Unknown error")}
                          </div>
                          <Button
                            onClick={() => { if (previewSource) { handleReprocess(previewSource); setPreviewSource(null); } }}
                            className="gap-1.5"
                          >
                            <RefreshCw className="w-4 h-4" /> {t("Riprova", "Retry")}
                          </Button>
                        </div>
                      ) : loadingPreview ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : previewChunks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                          {t("Nessun contenuto indicizzato ancora.", "No indexed content yet.")}
                        </p>
                      ) : (
                        <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
                          {previewChunks.map((chunk) => (
                            <div key={chunk.chunk_index} className="rounded-lg border border-border bg-secondary/40 p-3">
                              <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1.5">
                                {t("Chunk", "Chunk")} #{chunk.chunk_index}
                              </p>
                              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{chunk.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* Search test */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      {t("Test Ricerca Semantica", "Semantic Search Test")}
                    </h4>
                    <div className="flex gap-2">
                      <Input placeholder={t("Cerca nella knowledge base...", "Search the knowledge base...")} value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)} className="bg-secondary border-border text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleSearchTest()} />
                      <Button onClick={handleSearchTest} disabled={searching || !searchQuery.trim()} className="gap-1.5 shrink-0">
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.map((chunk, i) => (
                          <div key={chunk.id || i} className="p-3 rounded-lg bg-secondary/50 border border-border">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">#{i + 1}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">
                                {(chunk.similarity * 100).toFixed(1)}%
                              </Badge>
                            </div>
                            <p className="text-xs text-foreground/80 line-clamp-4 whitespace-pre-wrap">{chunk.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {chatbotVertical === "ecommerce" && (
              <div className="border-t border-border pt-3">
                {canUseEcommerce ? (
                  clientId ? <EcommerceKBStatus clientId={clientId} /> : null
                ) : (
                  <LockedProFeature
                    title={t("🛒 Product Catalog", "🛒 Catalogo Prodotti")}
                    description={t("Disponibile con il piano Pro", "Available on Pro plan")}
                    onUpgrade={() => showUpgrade("pro")}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}



      {/* ══════════════════════════════════════════════════ */}
      {/* SECTION 4 — Instructions (Priority: LOW ★)        */}
      {/* ══════════════════════════════════════════════════ */}
      {showInstructions && (
      <div className="glass rounded-xl p-5">
        <PriorityHeader
          num={isFree ? 2 : 3}
          icon="⚙️"
          title={t("Istruzioni", "Instructions")}
          subtitle={t(
            "Comportamento generale — usato come ultima risorsa",
            "General behavior — used as last resort"
          )}
          stars={1}
          starLabel={t("Priorità bassa", "Low priority")}
        />

        <div className="space-y-3">
          <Textarea
            value={systemPrompt}
            onChange={(event) => {
              systemPromptRef.current = event.target.value;
              setSystemPrompt(event.target.value);
            }}
            rows={10}
            className="min-h-[180px] resize-y"
            aria-label={t("Testo delle istruzioni", "Instructions text")}
            placeholder={t("Scrivi le istruzioni del bot...", "Write your bot's instructions...")}
          />
          <Button onClick={saveInstructions} disabled={savingPrompt} className="gradient-primary text-white border-0 glow-sm w-full h-11">
            {savingPrompt ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t("Salva Istruzioni", "Save Instructions")}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
          <Info className="w-3 h-3 shrink-0" />
          {t(
            "Scrivi qui le informazioni principali della tua attività: chi sei, prodotti e servizi, argomenti vietati, contatti e orari. Questo testo viene usato come ultima risorsa, dopo FAQ e Knowledge Base.",
            "Describe here: who you are, your products/services, forbidden topics, contact info and hours. This text is used as a last-resort source, after FAQ and Knowledge Base."
          )}
        </p>
      </div>
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} requiredPlan={upgradeRequiredPlan} variant="rag" />
    </div>
  );
};

export default ClientRAGKnowledgeBase;
