import { useState } from "react";
import { industryTemplates, IndustryTemplate } from "./templates";
import { KBSections } from "./types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

interface Props {
  onApply: (systemPrompt: string) => void;
  saving?: boolean;
  currentPrompt?: string;
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
      lines.push(`**${l("D", "Q")}:** ${faq.question}\n**${l("R", "A")}:** ${faq.answer}`);
    });
  }
  if (sections.tone_of_voice) lines.push(`## ${l("Tono di voce", "Tone of Voice")}\n${sections.tone_of_voice}`);
  if (sections.forbidden_topics) lines.push(`## ${l("Argomenti vietati", "Forbidden Topics")}\n${sections.forbidden_topics}`);
  if (sections.contacts_hours) lines.push(`## ${l("Contatti e orari", "Contacts & Hours")}\n${sections.contacts_hours}`);

  return lines.join("\n\n");
}

const IndustryTemplateSelector: React.FC<Props> = ({ onApply, saving, currentPrompt }) => {
  const { lang } = useLanguage();
  const l = (it: string, en: string) => lang === "it" ? it : en;
  
  const [step, setStep] = useState<"select" | "edit">("select");
  const [selected, setSelected] = useState<IndustryTemplate | null>(null);
  const [sections, setSections] = useState<KBSections | null>(null);

  const handleSelect = (template: IndustryTemplate) => {
    setSelected(template);
    const langKey = lang === "it" ? "it" : "en";
    setSections({ ...template.sections[langKey] });
    setStep("edit");
  };

  const handleSectionChange = (key: keyof KBSections, value: string) => {
    if (!sections) return;
    setSections(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const handleFaqChange = (index: number, field: "question" | "answer", value: string) => {
    if (!sections) return;
    const newFaqs = [...sections.faqs];
    newFaqs[index] = { ...newFaqs[index], [field]: value };
    setSections(prev => prev ? { ...prev, faqs: newFaqs } : prev);
  };

  const handleApply = () => {
    if (!sections) return;
    const prompt = buildPrompt(sections, lang);
    onApply(prompt);
  };

  // Step 1: Template selection grid
  if (step === "select") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            {l("Scegli un template per il tuo settore", "Choose a template for your industry")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {l(
            "Seleziona il template più vicino alla tua attività. Potrai personalizzarlo nel passaggio successivo.",
            "Select the template closest to your business. You can customize it in the next step."
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {industryTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleSelect(tmpl)}
              className="group glass rounded-xl p-4 text-left hover:border-primary/40 border border-border transition-all hover:bg-primary/5 active:scale-[0.98]"
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
        </div>
      </div>
    );
  }

  // Step 2: Edit template sections
  if (!sections || !selected) return null;

  const textFields: (keyof KBSections)[] = ["about_us", "products_services", "tone_of_voice", "forbidden_topics", "contacts_hours"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("select")}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selected.icon}</span>
            <h3 className="font-semibold text-foreground">
              {selected.name[lang === "it" ? "it" : "en"]}
            </h3>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {l(
          "Personalizza le sezioni con le informazioni della tua attività, poi salva come System Prompt.",
          "Customize the sections with your business info, then save as System Prompt."
        )}
      </p>

      <div className="space-y-4">
        {textFields.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-sm font-medium">{sectionLabels[key][lang === "it" ? "it" : "en"]}</Label>
            <Textarea
              value={sections[key] as string}
              onChange={(e) => handleSectionChange(key, e.target.value)}
              rows={key === "about_us" || key === "products_services" ? 4 : 3}
              className="bg-secondary border-border resize-none text-sm"
            />
          </div>
        ))}

        {/* FAQ */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{sectionLabels.faqs[lang === "it" ? "it" : "en"]}</Label>
          {sections.faqs.map((faq, i) => (
            <div key={i} className="glass rounded-lg p-3 space-y-2">
              <input
                value={faq.question}
                onChange={(e) => handleFaqChange(i, "question", e.target.value)}
                placeholder={l("Domanda", "Question")}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
              />
              <Textarea
                value={faq.answer}
                onChange={(e) => handleFaqChange(i, "answer", e.target.value)}
                placeholder={l("Risposta", "Answer")}
                rows={2}
                className="bg-secondary border-border resize-none text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleApply}
        disabled={saving}
        className="w-full gradient-primary text-white border-0 glow-sm h-11"
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        {l("Salva come System Prompt", "Save as System Prompt")}
      </Button>
    </div>
  );
};

export default IndustryTemplateSelector;
