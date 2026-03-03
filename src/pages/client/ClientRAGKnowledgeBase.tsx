import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Upload, Globe, HelpCircle, FileText, Trash2,
  RefreshCw, CheckCircle2, XCircle, Clock, Plus, Database
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

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  processing: { icon: Clock, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", label: "Elaborazione..." },
  ready: { icon: CheckCircle2, color: "bg-green-500/10 text-green-600 border-green-500/30", label: "Pronto" },
  error: { icon: XCircle, color: "bg-red-500/10 text-red-600 border-red-500/30", label: "Errore" },
  outdated: { icon: RefreshCw, color: "bg-orange-500/10 text-orange-600 border-orange-500/30", label: "Da aggiornare" },
};

const ClientRAGKnowledgeBase = () => {
  const { clientId } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [sources, setSources] = useState<KBSource[]>([]);
  const [chatbotId, setChatbotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("file");

  // Form states
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [freeText, setFreeText] = useState("");
  const [freeTextName, setFreeTextName] = useState("");

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    // Get chatbot ID
    const { data: config } = await supabase
      .from("chatbot_configs")
      .select("id")
      .eq("client_id", clientId)
      .limit(1)
      .single();
    if (!config) { setLoading(false); return; }
    setChatbotId(config.id);

    // Fetch sources
    const { data } = await supabase
      .from("knowledge_base" as any)
      .select("*")
      .eq("chatbot_id", config.id)
      .order("created_at", { ascending: false });
    setSources((data as any as KBSource[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll for processing sources
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatbotId) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowed = ["pdf", "docx", "doc", "txt", "md", "csv", "xlsx"];
    if (!allowed.includes(ext)) {
      toast({ title: lang === "it" ? "Formato non supportato" : "Unsupported format", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: lang === "it" ? "File troppo grande (max 50MB)" : "File too large (max 50MB)", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const storagePath = `${clientId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("kb-documents").upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      const { data: source, error: insertErr } = await supabase
        .from("knowledge_base" as any)
        .insert({
          chatbot_id: chatbotId,
          name: file.name,
          type: ext,
          file_path: storagePath,
          status: "processing",
        } as any)
        .select()
        .single();
      if (insertErr) throw insertErr;

      toast({ title: lang === "it" ? "File caricato, elaborazione in corso..." : "File uploaded, processing..." });
      setAddDialogOpen(false);
      fetchData();
      processSource((source as any).id);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim() || !chatbotId) return;
    setUploading(true);
    try {
      const { data: source, error } = await supabase
        .from("knowledge_base" as any)
        .insert({
          chatbot_id: chatbotId,
          name: new URL(urlInput.startsWith("http") ? urlInput : `https://${urlInput}`).hostname,
          type: "url",
          source_url: urlInput.trim(),
          status: "processing",
        } as any)
        .select()
        .single();
      if (error) throw error;

      setUrlInput("");
      setAddDialogOpen(false);
      fetchData();
      processSource((source as any).id);
      toast({ title: lang === "it" ? "URL aggiunto, scraping in corso..." : "URL added, scraping..." });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddFaq = async () => {
    if (!faqQuestion.trim() || !faqAnswer.trim() || !chatbotId) return;
    setUploading(true);
    try {
      const content = `Q: ${faqQuestion.trim()}\nA: ${faqAnswer.trim()}`;
      const { data: source, error } = await supabase
        .from("knowledge_base" as any)
        .insert({
          chatbot_id: chatbotId,
          name: `FAQ: ${faqQuestion.trim().slice(0, 50)}`,
          type: "faq",
          source_url: content,
          status: "processing",
        } as any)
        .select()
        .single();
      if (error) throw error;

      setFaqQuestion("");
      setFaqAnswer("");
      setAddDialogOpen(false);
      fetchData();
      processSource((source as any).id);
      toast({ title: lang === "it" ? "FAQ aggiunta" : "FAQ added" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddFreeText = async () => {
    if (!freeText.trim() || !chatbotId) return;
    setUploading(true);
    try {
      const { data: source, error } = await supabase
        .from("knowledge_base" as any)
        .insert({
          chatbot_id: chatbotId,
          name: freeTextName.trim() || (lang === "it" ? "Testo libero" : "Free text"),
          type: "txt",
          source_url: freeText.trim(),
          status: "processing",
        } as any)
        .select()
        .single();
      if (error) throw error;

      setFreeText("");
      setFreeTextName("");
      setAddDialogOpen(false);
      fetchData();
      processSource((source as any).id);
      toast({ title: lang === "it" ? "Testo aggiunto" : "Text added" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (source: KBSource) => {
    if (!confirm(lang === "it" ? "Eliminare questa fonte?" : "Delete this source?")) return;
    try {
      // Delete chunks first (cascade should handle it but be explicit)
      await supabase.from("knowledge_chunks" as any).delete().eq("knowledge_base_id", source.id);
      // Delete storage file if exists
      if (source.file_path) {
        await supabase.storage.from("kb-documents").remove([source.file_path]);
      }
      await supabase.from("knowledge_base" as any).delete().eq("id", source.id);
      toast({ title: lang === "it" ? "Fonte eliminata" : "Source deleted" });
      fetchData();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleReprocess = async (source: KBSource) => {
    await supabase.from("knowledge_base" as any).update({ status: "processing" } as any).eq("id", source.id);
    fetchData();
    processSource(source.id);
    toast({ title: lang === "it" ? "Rielaborazione avviata" : "Reprocessing started" });
  };

  const totalChunks = sources.filter(s => s.status === "ready").reduce((sum, s) => sum + s.chunk_count, 0);
  const readySources = sources.filter(s => s.status === "ready").length;
  const processingSources = sources.filter(s => s.status === "processing").length;

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            {lang === "it" ? "Knowledge Base RAG" : "RAG Knowledge Base"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "it"
              ? "Gestisci le fonti di conoscenza del tuo chatbot con ricerca semantica avanzata"
              : "Manage your chatbot's knowledge sources with advanced semantic search"}
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> {lang === "it" ? "Aggiungi fonte" : "Add source"}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{lang === "it" ? "Aggiungi fonte di conoscenza" : "Add knowledge source"}</DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="file" className="gap-1 text-xs"><Upload className="w-3 h-3" /> File</TabsTrigger>
                <TabsTrigger value="url" className="gap-1 text-xs"><Globe className="w-3 h-3" /> URL</TabsTrigger>
                <TabsTrigger value="faq" className="gap-1 text-xs"><HelpCircle className="w-3 h-3" /> FAQ</TabsTrigger>
                <TabsTrigger value="text" className="gap-1 text-xs"><FileText className="w-3 h-3" /> {lang === "it" ? "Testo" : "Text"}</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  {lang === "it" ? "Carica PDF, DOCX, TXT, MD, CSV o XLSX (max 50MB)" : "Upload PDF, DOCX, TXT, MD, CSV or XLSX (max 50MB)"}
                </p>
                <Input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {lang === "it" ? "Caricamento..." : "Uploading..."}</div>}
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  {lang === "it" ? "Inserisci l'URL della pagina da importare" : "Enter the page URL to import"}
                </p>
                <Input placeholder="https://example.com/page" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
                <Button onClick={handleAddUrl} disabled={uploading || !urlInput.trim()} className="w-full">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                  {lang === "it" ? "Importa pagina" : "Import page"}
                </Button>
              </TabsContent>

              <TabsContent value="faq" className="space-y-4 mt-4">
                <Input placeholder={lang === "it" ? "Domanda" : "Question"} value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)} />
                <Textarea placeholder={lang === "it" ? "Risposta" : "Answer"} value={faqAnswer} onChange={(e) => setFaqAnswer(e.target.value)} rows={4} />
                <Button onClick={handleAddFaq} disabled={uploading || !faqQuestion.trim() || !faqAnswer.trim()} className="w-full">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HelpCircle className="w-4 h-4 mr-2" />}
                  {lang === "it" ? "Aggiungi FAQ" : "Add FAQ"}
                </Button>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <Input placeholder={lang === "it" ? "Nome (opzionale)" : "Name (optional)"} value={freeTextName} onChange={(e) => setFreeTextName(e.target.value)} />
                <Textarea
                  placeholder={lang === "it" ? "Incolla qui il testo..." : "Paste text here..."}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  rows={8}
                />
                <Button onClick={handleAddFreeText} disabled={uploading || !freeText.trim()} className="w-full">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                  {lang === "it" ? "Aggiungi testo" : "Add text"}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Database className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{sources.length}</p>
                <p className="text-xs text-muted-foreground">{lang === "it" ? "Fonti totali" : "Total sources"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{readySources}</p>
                <p className="text-xs text-muted-foreground">{lang === "it" ? "Fonti pronte" : "Ready sources"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><FileText className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalChunks}</p>
                <p className="text-xs text-muted-foreground">{lang === "it" ? "Chunk totali" : "Total chunks"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing indicator */}
      {processingSources > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {lang === "it" ? `${processingSources} fonte/i in elaborazione...` : `${processingSources} source(s) processing...`}
                </p>
                <Progress value={undefined} className="mt-2 h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources list */}
      {sources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Database className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {lang === "it" ? "Nessuna fonte aggiunta" : "No sources added"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {lang === "it"
                ? "Aggiungi documenti, URL, FAQ o testo per addestrare il tuo chatbot con ricerca semantica avanzata."
                : "Add documents, URLs, FAQs or text to train your chatbot with advanced semantic search."}
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> {lang === "it" ? "Aggiungi prima fonte" : "Add first source"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const status = statusConfig[source.status] || statusConfig.error;
            const StatusIcon = status.icon;
            const typeIcons: Record<string, any> = {
              pdf: FileText, docx: FileText, doc: FileText, txt: FileText,
              md: FileText, csv: FileText, xlsx: FileText, url: Globe,
              faq: HelpCircle,
            };
            const TypeIcon = typeIcons[source.type] || FileText;

            return (
              <Card key={source.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <TypeIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{source.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase">{source.type}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        {source.status === "ready" && (
                          <span className="text-[10px] text-muted-foreground">{source.chunk_count} chunks</span>
                        )}
                      </div>
                      {source.error_message && (
                        <p className="text-xs text-red-500 mt-1 truncate">{source.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {(source.status === "error" || source.status === "outdated") && (
                        <Button variant="ghost" size="icon" onClick={() => handleReprocess(source)} title="Reprocess">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(source)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientRAGKnowledgeBase;
