import { useState } from "react";
import { industryTemplates, IndustryTemplate } from "./templates";
import { KBSections, defaultSections } from "./types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Plus, X } from "lucide-react";

interface Props {
  clientId: string;
  configId: string;
  currentKnowledgeBase?: string;
  plan?: string;
  vertical?: string | null;
  onSave: (systemPrompt: string) => Promise<void>;
}

const sectionLabels: Record<keyof KBSections, { it: string; en: string }> = {
  about_us: { it: "Chi siamo", en: "About Us" },
  products_services: { it: "Prodotti / Servizi", en: "Products / Services" },
  faqs: { it: "FAQ", en: "FAQ" },
  tone_of_voice: { it: "Tono di voce", en: "Tone of Voice" },
  forbidden_topics: { it: "Argomenti vietati", en: "Forbidden Topics" },
  contacts_hours: { it: "Contatti e orari", en: "Contacts & Hours" },
};

function buildPrompt(sections: KBSections, lang: string): string {
  const lines: string[] = [];
  const l = (it: string, en: string) => lang === "it" ? it : en;

  if (sections.about_us) lines.push(`## ${l("Chi siamo", "About Us")}\n${sections.about_us}`);
  if (sections.products_services) lines.push(`## ${l("Prodotti e Servizi", "Products & Services")}\n${sections.products_services}`);
  if (sections.faqs.length > 0) {
    lines.push(`## FAQ`);
    sections.faqs.forEach(faq => {
      if (faq.question.trim() && faq.answer.trim()) {
        lines.push(`**${l("D", "Q")}:** ${faq.question}\n**${l("R", "A")}:** ${faq.answer}`);
      }
    });
  }
  if (sections.tone_of_voice) lines.push(`## ${l("Tono di voce", "Tone of Voice")}\n${sections.tone_of_voice}`);
  if (sections.forbidden_topics) lines.push(`## ${l("Argomenti vietati", "Forbidden Topics")}\n${sections.forbidden_topics}`);
  if (sections.contacts_hours) lines.push(`## ${l("Contatti e orari", "Contacts & Hours")}\n${sections.contacts_hours}`);

  return lines.join("\n\n");
}

const STEPS = ["template", "about", "products", "faqs", "tone", "contacts", "review"] as const;
type Step = typeof STEPS[number];

const KnowledgeBaseWizard: React.FC<Props> = ({ clientId, configId, currentKnowledgeBase, plan, vertical, onSave }) => {
  const { lang } = useLanguage();
  const l = (it: string, en: string) => lang === "it" ? it : en;

  // Only templates matching the client vertical are shown (generic ones are hidden)
  const visibleTemplates = industryTemplates.filter((tmpl) => !!vertical && tmpl.vertical === vertical);
  const singleTemplate = visibleTemplates.length === 1 ? visibleTemplates[0] : null;
  const langKey = lang === "it" ? "it" : "en";

  const [step, setStep] = useState<Step>(singleTemplate ? "about" : "template");
  const [selected, setSelected] = useState<IndustryTemplate | null>(singleTemplate);
  const [sections, setSections] = useState<KBSections>(
    singleTemplate ? { ...singleTemplate.sections[langKey] } : { ...defaultSections }
  );
  const [saving, setSaving] = useState(false);


  const handleSelect = (template: IndustryTemplate) => {
    setSelected(template);
    const langKey = lang === "it" ? "it" : "en";
    setSections({ ...template.sections[langKey] });
    setStep("about");
  };

  const handleStartBlank = () => {
    setSections({ ...defaultSections });
    setStep("about");
  };

  const handleSectionChange = (key: keyof KBSections, value: string) => {
    setSections(prev => ({ ...prev, [key]: value }));
  };

  const handleFaqChange = (index: number, field: "question" | "answer", value: string) => {
    const newFaqs = [...sections.faqs];
    newFaqs[index] = { ...newFaqs[index], [field]: value };
    setSections(prev => ({ ...prev, faqs: newFaqs }));
  };

  const addFaq = () => {
    setSections(prev => ({ ...prev, faqs: [...prev.faqs, { question: "", answer: "" }] }));
  };

  const removeFaq = (idx: number) => {
    setSections(prev => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    const prompt = buildPrompt(sections, lang);
    await onSave(prompt);
    setSaving(false);
  };

  const stepIndex = STEPS.indexOf(step);
  const canGoBack = stepIndex > 0 && step !== "template";
  const canGoForward = stepIndex < STEPS.length - 1 && step !== "template";

  const goBack = () => {
    if (stepIndex === 1) setStep("template");
    else setStep(STEPS[stepIndex - 1]);
  };
  const goForward = () => setStep(STEPS[stepIndex + 1]);

  // Step 1: Template selection — filtered by client vertical
  const visibleTemplates = industryTemplates.filter(
    (tmpl) => tmpl.vertical === null || !vertical || tmpl.vertical === vertical
  );

  if (step === "template") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">
            {l("Scegli un template o parti da zero", "Choose a template or start blank")}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleSelect(tmpl)}
              className="group rounded-xl p-4 text-left hover:border-primary/40 border border-border transition-all hover:bg-primary/5 active:scale-[0.98] bg-secondary/30"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{tmpl.icon}</span>
                <span className="font-medium text-foreground text-sm">
                  {tmpl.name[lang === "it" ? "it" : "en"]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {tmpl.description[lang === "it" ? "it" : "en"]}
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {l("Seleziona", "Select")} <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
          <button
            onClick={handleStartBlank}
            className="group rounded-xl p-4 text-left hover:border-primary/40 border border-dashed border-border transition-all hover:bg-primary/5 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📝</span>
              <span className="font-medium text-foreground text-sm">
                {l("Parti da zero", "Start blank")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {l("Configura manualmente ogni sezione.", "Manually configure each section.")}
            </p>
          </button>
        </div>
      </div>
    );
  }

  // Progress bar
  const progress = ((stepIndex) / (STEPS.length - 1)) * 100;

  const renderStepContent = () => {
    switch (step) {
      case "about":
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{sectionLabels.about_us[lang === "it" ? "it" : "en"]}</Label>
            <Textarea value={sections.about_us} onChange={(e) => handleSectionChange("about_us", e.target.value)}
              rows={4} className="bg-secondary border-border resize-none text-sm"
              placeholder={l("Descrivi la tua azienda...", "Describe your company...")} />
          </div>
        );
      case "products":
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{sectionLabels.products_services[lang === "it" ? "it" : "en"]}</Label>
            <Textarea value={sections.products_services} onChange={(e) => handleSectionChange("products_services", e.target.value)}
              rows={4} className="bg-secondary border-border resize-none text-sm"
              placeholder={l("Elenca prodotti e servizi...", "List products and services...")} />
          </div>
        );
      case "faqs":
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{sectionLabels.faqs[lang === "it" ? "it" : "en"]}</Label>
            {sections.faqs.map((faq, i) => (
              <div key={i} className="rounded-lg bg-secondary/50 p-3 space-y-2 relative group">
                <Input value={faq.question} onChange={(e) => handleFaqChange(i, "question", e.target.value)}
                  placeholder={l("Domanda", "Question")} className="bg-background border-border text-sm" />
                <Textarea value={faq.answer} onChange={(e) => handleFaqChange(i, "answer", e.target.value)}
                  placeholder={l("Risposta", "Answer")} rows={2} className="bg-background border-border resize-none text-sm" />
                <button onClick={() => removeFaq(i)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addFaq} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> {l("Aggiungi FAQ", "Add FAQ")}
            </Button>
          </div>
        );
      case "tone":
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">{sectionLabels.tone_of_voice[lang === "it" ? "it" : "en"]}</Label>
              <Textarea value={sections.tone_of_voice} onChange={(e) => handleSectionChange("tone_of_voice", e.target.value)}
                rows={3} className="bg-secondary border-border resize-none text-sm"
                placeholder={l("Es: professionale ma amichevole...", "E.g.: professional but friendly...")} />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">{sectionLabels.forbidden_topics[lang === "it" ? "it" : "en"]}</Label>
              <Textarea value={sections.forbidden_topics} onChange={(e) => handleSectionChange("forbidden_topics", e.target.value)}
                rows={3} className="bg-secondary border-border resize-none text-sm"
                placeholder={l("Es: non parlare di politica, religione...", "E.g.: don't discuss politics, religion...")} />
            </div>
          </div>
        );
      case "contacts":
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{sectionLabels.contacts_hours[lang === "it" ? "it" : "en"]}</Label>
            <Textarea value={sections.contacts_hours} onChange={(e) => handleSectionChange("contacts_hours", e.target.value)}
              rows={4} className="bg-secondary border-border resize-none text-sm"
              placeholder={l("Es: Lun-Ven 9-18, Tel: 02...", "E.g.: Mon-Fri 9-6, Phone: +1...")} />
          </div>
        );
      case "review":
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {l("Anteprima del System Prompt generato:", "Preview of generated System Prompt:")}
            </p>
            <pre className="text-xs bg-secondary/50 rounded-lg p-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-foreground/80 border border-border">
              {buildPrompt(sections, lang) || l("(vuoto)", "(empty)")}
            </pre>
          </div>
        );
      default:
        return null;
    }
  };

  const stepLabels: Record<Step, { it: string; en: string }> = {
    template: { it: "Template", en: "Template" },
    about: { it: "Chi siamo", en: "About Us" },
    products: { it: "Prodotti", en: "Products" },
    faqs: { it: "FAQ", en: "FAQ" },
    tone: { it: "Tono", en: "Tone" },
    contacts: { it: "Contatti", en: "Contacts" },
    review: { it: "Riepilogo", en: "Review" },
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{stepLabels[step][lang === "it" ? "it" : "en"]}</span>
          <span>{stepIndex}/{STEPS.length - 1}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {renderStepContent()}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={goBack} disabled={!canGoBack} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> {l("Indietro", "Back")}
        </Button>
        {step === "review" ? (
          <Button onClick={handleSave} disabled={saving} className="gap-1.5 gradient-primary text-white border-0 glow-sm">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {l("Salva come Istruzioni", "Save as Instructions")}
          </Button>
        ) : (
          <Button size="sm" onClick={goForward} disabled={!canGoForward} className="gap-1.5">
            {l("Avanti", "Next")} <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBaseWizard;
