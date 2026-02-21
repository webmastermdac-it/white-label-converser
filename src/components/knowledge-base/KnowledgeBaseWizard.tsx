import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { industryTemplates, IndustryTemplate } from "./templates";
import { KBDocument } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, Check, Sparkles, Upload, Globe, FileText, SkipForward } from "lucide-react";
import DocumentUpload from "./DocumentUpload";
import WebScraper from "./WebScraper";

interface Props {
  clientId: string;
  configId: string;
  currentKnowledgeBase: string;
  onSave: (kb: string) => void;
}

const STEPS = [
  { id: 1, label: "Template", icon: "📋" },
  { id: 2, label: "Documenti", icon: "📄" },
  { id: 3, label: "Sito Web", icon: "🌐" },
  { id: 4, label: "Revisione", icon: "✏️" },
];

const TONES = [
  { value: "professionale", label: "Professionale" },
  { value: "amichevole", label: "Amichevole" },
  { value: "formale", label: "Formale" },
  { value: "giovane", label: "Giovane e dinamico" },
];

function templateToText(t: IndustryTemplate): string {
  const lines: string[] = [];
  lines.push("## CHI SIAMO", t.sections.about_us, "");
  lines.push("## SERVIZI/PRODOTTI", t.sections.products_services, "");
  lines.push("## DOMANDE FREQUENTI");
  t.sections.faqs.forEach((f) => {
    lines.push(`D: ${f.question}`, `R: ${f.answer}`, "");
  });
  lines.push("## TONO DI VOCE", t.sections.tone_of_voice, "");
  lines.push("## CONTATTI", t.sections.contacts_hours, "");
  lines.push("## ARGOMENTI VIETATI", t.sections.forbidden_topics);
  return lines.join("\n");
}

const blankTemplate: IndustryTemplate = {
  id: "blank",
  icon: "✏️",
  name: "Inizia da zero",
  description: "Parti con una base vuota e personalizza tutto",
  sections: {
    about_us: "",
    products_services: "",
    faqs: [],
    tone_of_voice: "",
    forbidden_topics: "",
    contacts_hours: "Telefono: da compilare\nEmail: da compilare\nOrari: da compilare",
  },
};

const KnowledgeBaseWizard: React.FC<Props> = ({ clientId, configId, currentKnowledgeBase, onSave }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState(currentKnowledgeBase);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [scrapedContent, setScrapedContent] = useState("");
  const [quickAdd, setQuickAdd] = useState("");
  const [forbiddenTopics, setForbiddenTopics] = useState("");
  const [tone, setTone] = useState("");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const allTemplates = [...industryTemplates, blankTemplate];

  // Step 1: Select template
  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    const t = allTemplates.find((x) => x.id === id);
    if (t && t.id !== "blank") {
      setKnowledgeBase(templateToText(t));
    } else {
      setKnowledgeBase("");
    }
  };

  // Step 2: Documents change
  const handleDocumentsChange = (docs: KBDocument[]) => {
    setDocuments(docs);
    supabase
      .from("chatbot_configs")
      .update({ knowledge_base_documents: docs as any })
      .eq("id", configId);
  };

  // Step 3: Scraped content
  const handleScrapedContent = (content: string) => {
    setScrapedContent(content);
  };

  // Step 4: Quick add
  const handleQuickAdd = () => {
    if (!quickAdd.trim()) return;
    setKnowledgeBase((prev) => prev + "\n\n" + quickAdd.trim());
    setQuickAdd("");
  };

  // Build final KB
  const buildFinalKB = useCallback(() => {
    let final = knowledgeBase;

    // Append document text
    const readyDocs = documents.filter((d) => d.status === "ready" && d.extractedText);
    if (readyDocs.length > 0) {
      final += "\n\n## CONTENUTO DOCUMENTI\n";
      readyDocs.forEach((d) => {
        final += `\n### ${d.filename}\n${d.extractedText}\n`;
      });
    }

    // Append scraped content
    if (scrapedContent.trim()) {
      final += "\n\n## CONTENUTO SITO WEB\n" + scrapedContent;
    }

    // Append forbidden topics if added in step 4
    if (forbiddenTopics.trim()) {
      final += "\n\n## ARGOMENTI VIETATI\n" + forbiddenTopics;
    }

    // Append tone if selected in step 4
    if (tone) {
      final += "\n\n## TONO DI VOCE\n" + tone;
    }

    return final;
  }, [knowledgeBase, documents, scrapedContent, forbiddenTopics, tone]);

  const handleSave = async () => {
    setSaving(true);
    const finalKB = buildFinalKB();
    onSave(finalKB);
    setSaving(false);
    setCompleted(true);
  };

  const goTo = (s: number) => {
    if (s >= 1 && s <= 4) setStep(s);
  };

  const canProceedStep1 = !!selectedTemplate;

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Knowledge Base salvata! 🎉</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          Il tuo chatbot è pronto! Vuoi testarlo ora?
        </p>
        <Button
          className="mt-4 gradient-primary text-white border-0"
          onClick={() => window.location.href = "/dashboard/preview"}
        >
          Testa il chatbot →
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex items-center">
            <button
              onClick={() => s.id < step && goTo(s.id)}
              disabled={s.id > step}
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg transition-all w-full justify-center ${
                s.id === step
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : s.id < step
                  ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
              {s.id < step && <Check className="w-3 h-3" />}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 mx-0.5 rounded ${s.id < step ? "bg-primary/40" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <h3 className="text-base font-semibold text-foreground">📋 Da dove vuoi partire?</h3>
            <p className="text-sm text-muted-foreground mt-1">Scegli un template per il tuo settore o inizia da zero</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTemplateSelect(t.id)}
                className={`p-4 rounded-xl text-left transition-all border ${
                  selectedTemplate === t.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-secondary hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Documents */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <h3 className="text-base font-semibold text-foreground">📄 Hai documenti da aggiungere?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              PDF o Word con listino prezzi, brochure, FAQ — il bot li leggerà automaticamente
            </p>
          </div>

          <DocumentUpload
            clientId={clientId}
            documents={documents}
            onChange={handleDocumentsChange}
          />
        </div>
      )}

      {/* Step 3: Web Scraping */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <h3 className="text-base font-semibold text-foreground">🌐 Vuoi che il bot conosca il tuo sito?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Inserisci l'URL del tuo sito e analizzeremo il contenuto automaticamente
            </p>
          </div>

          <WebScraper
            scrapedContent={scrapedContent}
            onUseContent={handleScrapedContent}
          />
        </div>
      )}

      {/* Step 4: Final Review */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <h3 className="text-base font-semibold text-foreground">✏️ Rivedi e personalizza</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Modifica liberamente il contenuto che il bot userà come base di conoscenza
            </p>
          </div>

          <Textarea
            value={buildFinalKB()}
            onChange={(e) => {
              // When user edits directly, reset everything and use the raw text
              setKnowledgeBase(e.target.value);
              setDocuments([]);
              setScrapedContent("");
              setForbiddenTopics("");
              setTone("");
            }}
            rows={14}
            className="bg-secondary border-border resize-none font-mono text-sm"
          />

          <div className="text-xs text-muted-foreground text-right">
            {buildFinalKB().length.toLocaleString()} caratteri
          </div>

          {/* Quick-add fields */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="space-y-2">
              <Label className="text-xs">Aggiungi un'informazione importante</Label>
              <div className="flex gap-2">
                <Input
                  value={quickAdd}
                  onChange={(e) => setQuickAdd(e.target.value)}
                  placeholder="Es: Accettiamo pagamenti con carta e contanti"
                  className="bg-background border-border text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                />
                <Button size="sm" variant="outline" onClick={handleQuickAdd} disabled={!quickAdd.trim()}>
                  Aggiungi
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Argomenti vietati</Label>
              <Input
                value={forbiddenTopics}
                onChange={(e) => setForbiddenTopics(e.target.value)}
                placeholder="Es: prezzi competitor, politica, offerte non autorizzate"
                className="bg-background border-border text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tono di voce</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-background border-border text-sm">
                  <SelectValue placeholder="Seleziona un tono..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <div>
          {step > 1 && (
            <Button variant="ghost" onClick={() => goTo(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Skip button for steps 2 and 3 */}
          {(step === 2 || step === 3) && (
            <Button variant="ghost" onClick={() => goTo(step + 1)} className="text-muted-foreground">
              <SkipForward className="w-4 h-4 mr-1" /> Salta
            </Button>
          )}

          {step < 4 && (
            <Button
              onClick={() => goTo(step + 1)}
              disabled={step === 1 && !canProceedStep1}
            >
              Avanti <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {step === 4 && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary text-white border-0 glow-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <span className="mr-1">💾</span>
              )}
              Salva Knowledge Base
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseWizard;
