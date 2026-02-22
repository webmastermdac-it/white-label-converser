import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
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
  plan?: string;
}

function templateToText(tmpl: IndustryTemplate, lang: "it" | "en"): string {
  const s = tmpl.sections[lang];
  const lines: string[] = [];
  const isEn = lang === "en";
  lines.push(isEn ? "## ABOUT US" : "## CHI SIAMO", s.about_us, "");
  lines.push(isEn ? "## PRODUCTS & SERVICES" : "## SERVIZI/PRODOTTI", s.products_services, "");
  lines.push(isEn ? "## FREQUENTLY ASKED QUESTIONS" : "## DOMANDE FREQUENTI");
  s.faqs.forEach((f) => {
    lines.push(`${isEn ? "Q" : "D"}: ${f.question}`, `${isEn ? "A" : "R"}: ${f.answer}`, "");
  });
  lines.push(isEn ? "## TONE OF VOICE" : "## TONO DI VOCE", s.tone_of_voice, "");
  lines.push(isEn ? "## CONTACT" : "## CONTATTI", s.contacts_hours, "");
  lines.push(isEn ? "## FORBIDDEN TOPICS" : "## ARGOMENTI VIETATI", s.forbidden_topics);
  return lines.join("\n");
}

const KnowledgeBaseWizard: React.FC<Props> = ({ clientId, configId, currentKnowledgeBase, onSave, plan = "pro" }) => {
  const { toast } = useToast();
  const { lang, t } = useLanguage();
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

  const STEPS = [
    { id: 1, label: t("Choose Template", "Scegli Template"), icon: "📋" },
    { id: 2, label: t("Upload Documents", "Carica Documenti"), icon: "📄" },
    { id: 3, label: t("Add Website", "Aggiungi Sito"), icon: "🌐" },
    { id: 4, label: t("Final Review", "Revisione Finale"), icon: "✏️" },
  ];

  const TONES = [
    { value: "professionale", label: t("Professional", "Professionale") },
    { value: "amichevole", label: t("Friendly", "Amichevole") },
    { value: "formale", label: t("Formal", "Formale") },
    { value: "giovane", label: t("Young and dynamic", "Giovane e dinamico") },
  ];

  const blankTemplate = {
    id: "blank",
    icon: "✏️",
    name: t("Start from scratch", "Inizia da zero"),
    description: t("Start with a blank base and customize everything", "Parti con una base vuota e personalizza tutto"),
  };

  const allTemplates = [
    ...industryTemplates.map((tmpl) => ({
      id: tmpl.id,
      icon: tmpl.icon,
      name: tmpl.name[lang],
      description: tmpl.description[lang],
    })),
    blankTemplate,
  ];

  // Step 1: Select template
  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    const tmpl = industryTemplates.find((x) => x.id === id);
    if (tmpl) {
      setKnowledgeBase(templateToText(tmpl, lang));
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
    const isEn = lang === "en";
    let final = knowledgeBase;

    const readyDocs = documents.filter((d) => d.status === "ready" && d.extractedText);
    if (readyDocs.length > 0) {
      final += isEn ? "\n\n## DOCUMENT CONTENT\n" : "\n\n## CONTENUTO DOCUMENTI\n";
      readyDocs.forEach((d) => {
        final += `\n### ${d.filename}\n${d.extractedText}\n`;
      });
    }

    if (scrapedContent.trim()) {
      final += (isEn ? "\n\n## WEBSITE CONTENT\n" : "\n\n## CONTENUTO SITO WEB\n") + scrapedContent;
    }

    if (forbiddenTopics.trim()) {
      final += (isEn ? "\n\n## FORBIDDEN TOPICS\n" : "\n\n## ARGOMENTI VIETATI\n") + forbiddenTopics;
    }

    if (tone) {
      final += (isEn ? "\n\n## TONE OF VOICE\n" : "\n\n## TONO DI VOCE\n") + tone;
    }

    return final;
  }, [knowledgeBase, documents, scrapedContent, forbiddenTopics, tone, lang]);

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
        <h3 className="text-lg font-semibold text-foreground">
          {t("Knowledge Base saved!", "Knowledge Base salvata!")} 🎉
        </h3>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          {t("Your chatbot is ready! Do you want to test it now?", "Il tuo chatbot è pronto! Vuoi testarlo ora?")}
        </p>
        <Button
          className="mt-4 gradient-primary text-white border-0"
          onClick={() => window.location.href = "/dashboard/preview"}
        >
          {t("Go to preview", "Vai all'anteprima")} →
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
            <h3 className="text-base font-semibold text-foreground">📋 {t("Where do you want to start?", "Da dove vuoi partire?")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Choose a template for your sector or start from scratch", "Scegli un template per il tuo settore o inizia da zero")}
            </p>
          </div>

          {plan === "free" ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                ⭐ {t("Sector templates available from Starter", "Template per settore disponibili da Starter")}
              </p>
              <p>{t("With the Free plan you can only use the blank template.", "Con il piano Free puoi usare solo il template vuoto.")}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allTemplates
              .filter((tmpl) => plan !== "free" || tmpl.id === "blank")
              .map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleTemplateSelect(tmpl.id)}
                className={`p-4 rounded-xl text-left transition-all border ${
                  selectedTemplate === tmpl.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-secondary hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tmpl.icon}</span>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{tmpl.name}</h4>
                    <p className="text-xs text-muted-foreground">{tmpl.description}</p>
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
            <h3 className="text-base font-semibold text-foreground">
              📄 {t("Do you have documents to add?", "Hai documenti da aggiungere?")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "PDF or Word files with price lists, brochures, FAQs — the bot will read them automatically",
                "PDF o Word con listino prezzi, brochure, FAQ — il bot li leggerà automaticamente"
              )}
            </p>
          </div>

          {plan === "free" ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                ⭐ {t("Document upload available from Starter", "Upload documenti disponibile da Starter")}
              </p>
              <p>{t("Upgrade your plan to upload PDF and Word files.", "Passa a un piano superiore per caricare PDF e Word.")}</p>
              <a href="/dashboard/upgrade" className="text-primary hover:underline text-xs mt-1 inline-block">
                {t("Upgrade", "Upgrade")} →
              </a>
            </div>
          ) : (
            <DocumentUpload
              clientId={clientId}
              documents={documents}
              onChange={handleDocumentsChange}
            />
          )}
        </div>
      )}

      {/* Step 3: Web Scraping */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              🌐 {t("Do you want the bot to know your website?", "Vuoi che il bot conosca il tuo sito?")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "Enter your website URL and we will analyze the content automatically",
                "Inserisci l'URL del tuo sito e analizzeremo il contenuto automaticamente"
              )}
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
            <h3 className="text-base font-semibold text-foreground">
              ✏️ {t("Review and customize", "Rivedi e personalizza")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "Freely edit the content the bot will use as its knowledge base",
                "Modifica liberamente il contenuto che il bot userà come base di conoscenza"
              )}
            </p>
          </div>

          <Textarea
            value={buildFinalKB()}
            onChange={(e) => {
              setKnowledgeBase(e.target.value);
              setDocuments([]);
              setScrapedContent("");
              setForbiddenTopics("");
              setTone("");
            }}
            rows={14}
            className="bg-secondary border-border resize-none font-mono text-base md:text-sm min-h-[200px]"
          />

          <div className="text-xs text-muted-foreground text-right">
            {buildFinalKB().length.toLocaleString()} {t("characters used", "caratteri utilizzati")}
          </div>

          {/* Quick-add fields */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="space-y-2">
              <Label className="text-xs">{t("Add an important detail", "Aggiungi un'informazione importante")}</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={quickAdd}
                  onChange={(e) => setQuickAdd(e.target.value)}
                  placeholder={t("E.g.: We accept card and cash payments", "Es: Accettiamo pagamenti con carta e contanti")}
                  className="bg-background border-border text-base md:text-sm flex-1 h-12 md:h-10"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                />
                <Button size="sm" variant="outline" onClick={handleQuickAdd} disabled={!quickAdd.trim()} className="min-h-[44px] md:min-h-0">
                  {t("Add", "Aggiungi")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{t("Forbidden topics", "Argomenti vietati")}</Label>
              <Input
                value={forbiddenTopics}
                onChange={(e) => setForbiddenTopics(e.target.value)}
                placeholder={t("E.g.: competitor prices, politics, unauthorized offers", "Es: prezzi competitor, politica, offerte non autorizzate")}
                className="bg-background border-border text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{t("Tone of voice", "Tono di voce")}</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-background border-border text-sm">
                  <SelectValue placeholder={t("Select a tone...", "Seleziona un tono...")} />
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
      <div className="flex justify-between items-center pt-2 md:static fixed bottom-0 inset-x-0 bg-background/90 backdrop-blur-sm p-4 md:p-0 border-t border-border md:border-0 z-10">
        <div>
          {step > 1 && (
            <Button variant="ghost" onClick={() => goTo(step - 1)} className="min-h-[44px]">
              <ArrowLeft className="w-4 h-4 mr-1" /> {t("Back", "Indietro")}
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {(step === 2 || step === 3) && (
            <Button variant="ghost" onClick={() => goTo(step + 1)} className="text-muted-foreground min-h-[44px]">
              <SkipForward className="w-4 h-4 mr-1" /> {t("Skip", "Salta")}
            </Button>
          )}

          {step < 4 && (
            <Button
              onClick={() => goTo(step + 1)}
              disabled={step === 1 && !canProceedStep1}
              className="min-h-[44px]"
            >
              {t("Next", "Avanti")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {step === 4 && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary text-white border-0 glow-sm min-h-[44px]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <span className="mr-1">💾</span>
              )}
              {t("Save Knowledge Base", "Salva Knowledge Base")}
            </Button>
          )}
        </div>
      </div>
      {/* Spacer for fixed bottom nav on mobile */}
      <div className="h-16 md:h-0" />
    </div>
  );
};

export default KnowledgeBaseWizard;
