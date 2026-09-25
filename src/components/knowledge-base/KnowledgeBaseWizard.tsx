import { useState, useRef, useEffect } from "react";
import { industryTemplates, IndustryTemplate } from "./templates";
import { KBSections, defaultSections } from "./types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Plus, X, ChevronDown, Table2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clientId: string;
  configId: string;
  currentKnowledgeBase?: string;
  plan?: string;
  vertical?: string | null;
  maxFaqs?: number;
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
  if (sections.tone_of_voice) lines.push(`## ${l("Tono di voce", "Tone of Voice")}\n${sections.tone_of_voice}`);
  if (sections.forbidden_topics) lines.push(`## ${l("Argomenti vietati", "Forbidden Topics")}\n${sections.forbidden_topics}`);
  if (sections.contacts_hours) lines.push(`## ${l("Contatti e orari", "Contacts & Hours")}\n${sections.contacts_hours}`);

  return lines.join("\n\n");
}

type TonePreset = {
  id: string;
  label: { it: string; en: string };
  sub: { it: string; en: string };
  fullName: { it: string; en: string };
  text: { it: string; en: string };
  characteristics: { it: string; en: string };
  archetypes: { it: string; en: string };
  example: { it: string; en: string };
};

const TONE_PRESETS: TonePreset[] = [
  {
    id: "istituzionale",
    label: { it: "Istituzionale", en: "Institutional" },
    sub: { it: "Preciso, autorevole, il Lei", en: "Precise, authoritative, formal" },
    fullName: { it: "Istituzionale / Formale", en: "Institutional / Formal" },
    text: {
      it: `Tono istituzionale e formale: linguaggio preciso e autorevole, terza persona o forma di cortesia ("Lei"), evita slang e abbreviazioni. Esempio: "La ringraziamo per aver scelto i nostri servizi. La vostra sicurezza è la nostra priorità."`,
      en: `Institutional and formal tone: precise, authoritative language, third person or formal courtesy ("you"), avoids slang and abbreviations. Example: "Thank you for choosing our services. Your safety is our priority."`,
    },
    characteristics: {
      it: `Linguaggio preciso, autorevole, uso della terza persona o del "Lei". Evita slang e abbreviazioni.`,
      en: `Precise, authoritative language, third person or formal "you". Avoids slang and abbreviations.`,
    },
    archetypes: { it: "Sovrano, Saggio", en: "Ruler, Sage" },
    example: {
      it: "La ringraziamo per aver scelto i nostri servizi. La vostra sicurezza è la nostra priorità.",
      en: "Thank you for choosing our services. Your safety is our priority.",
    },
  },
  {
    id: "amichevole",
    label: { it: "Amichevole", en: "Friendly" },
    sub: { it: "Caldo, colloquiale, il tu", en: "Warm, casual, informal" },
    fullName: { it: "Amichevole / Informale", en: "Friendly / Informal" },
    text: {
      it: `Tono amichevole e informale: caldo, accessibile, usa il "tu" e un linguaggio colloquiale ma curato. Esempio: "Ciao! Siamo felici di averti qui. Mettiti comodo, pensiamo a tutto noi."`,
      en: `Friendly and informal tone: warm, approachable, uses the informal "you" and casual but polished language. Example: "Hi! We're happy to have you here. Make yourself at home, we'll take care of everything."`,
    },
    characteristics: {
      it: `Caldo, accessibile, usa il "tu" e un linguaggio colloquiale ma curato.`,
      en: `Warm, approachable, uses the informal "you" and casual but polished language.`,
    },
    archetypes: { it: "Uomo Comune, Innocente", en: "Everyman, Innocent" },
    example: {
      it: "Ciao! Siamo felici di averti qui. Mettiti comodo, pensiamo a tutto noi.",
      en: "Hi! We're happy to have you here. Make yourself at home, we'll take care of everything.",
    },
  },
  {
    id: "ironico",
    label: { it: "Ironico", en: "Ironic" },
    sub: { it: "Giocoso, battute leggere", en: "Playful, light jokes" },
    fullName: { it: "Ironico / Divertente", en: "Ironic / Fun" },
    text: {
      it: `Tono ironico e divertente: giocoso, leggero, fa uso di battute, giochi di parole e piccole storie per intrattenere. Esempio: "Sappiamo che odi i lunedì. Ecco qualcosa che ti farà sorridere (o almeno ci prova)."`,
      en: `Ironic and fun tone: playful, light, uses jokes, wordplay and little stories to entertain. Example: "We know you hate Mondays. Here's something to make you smile (or at least try)."`,
    },
    characteristics: {
      it: "Giocoso, leggero, fa uso di battute, giochi di parole e storielle per intrattenere.",
      en: "Playful, light, uses jokes, wordplay and little stories to entertain.",
    },
    archetypes: { it: "Burlone (Jester)", en: "Jester" },
    example: {
      it: "Sappiamo che odi i lunedì. Ecco qualcosa che ti farà sorridere (o almeno ci prova).",
      en: "We know you hate Mondays. Here's something to make you smile (or at least try).",
    },
  },
  {
    id: "ispirazionale",
    label: { it: "Ispirazionale", en: "Inspirational" },
    sub: { it: "Motivante, epico", en: "Motivating, epic" },
    fullName: { it: "Ispirazionale / Epico", en: "Inspirational / Epic" },
    text: {
      it: `Tono ispirazionale ed epico: evocativo, motivante, orientato al superamento dei limiti e al cambiamento. Esempio: "Il futuro non si aspetta, si costruisce. Abbatti le barriere e libera il tuo potenziale."`,
      en: `Inspirational and epic tone: evocative, motivating, focused on pushing limits and change. Example: "The future isn't waited for, it's built. Break down barriers and unleash your potential."`,
    },
    characteristics: {
      it: "Evocativo, motivante, orientato al superamento dei limiti e al cambiamento.",
      en: "Evocative, motivating, oriented to pushing limits and change.",
    },
    archetypes: { it: "Eroe, Ribelle", en: "Hero, Rebel" },
    example: {
      it: "Il futuro non si aspetta, si costruisce. Abbatti le barriere e libera il tuo potenziale.",
      en: "The future isn't waited for, it's built. Break down barriers and unleash your potential.",
    },
  },
  {
    id: "tecnico",
    label: { it: "Tecnico", en: "Technical" },
    sub: { it: "Dati, precisione, oggettività", en: "Data, precision, objectivity" },
    fullName: { it: "Tecnico / Specialistico", en: "Technical / Specialist" },
    text: {
      it: `Tono tecnico e specialistico: focalizzato su dati, precisione, termini di settore e oggettività. Esempio: "Il nuovo algoritmo ottimizza l'efficienza energetica del 42% riducendo i tempi di latenza."`,
      en: `Technical and specialist tone: focused on data, precision, industry terms and objectivity. Example: "The new algorithm improves energy efficiency by 42% while reducing latency."`,
    },
    characteristics: {
      it: "Focalizzato su dati, precisione scientifica, termini di settore e oggettività.",
      en: "Focused on data, scientific precision, industry terms and objectivity.",
    },
    archetypes: { it: "Creatore, Saggio", en: "Creator, Sage" },
    example: {
      it: "Il nuovo algoritmo ottimizza l'efficienza energetica del 42% riducendo i tempi di latenza.",
      en: "The new algorithm improves energy efficiency by 42% while reducing latency.",
    },
  },
  {
    id: "irriverente",
    label: { it: "Irriverente", en: "Irreverent" },
    sub: { it: "Diretto, provocatorio", en: "Direct, provocative" },
    fullName: { it: "Irriverente / Provocatorio", en: "Irreverent / Provocative" },
    text: {
      it: `Tono irriverente e provocatorio: diretto, audace, rompe gli schemi e sfida lo status quo, a volte con sarcasmo. Esempio: "Le solite regole hanno stancato. È ora di fare di testa propria. Tu da che parte stai?"`,
      en: `Irreverent and provocative tone: direct, bold, breaks the mold and challenges the status quo, sometimes with sarcasm. Example: "The usual rules have worn out. Time to think for yourself. Which side are you on?"`,
    },
    characteristics: {
      it: "Diretto, audace, rompe gli schemi e sfida lo status quo, a volte usando il sarcasmo.",
      en: "Direct, bold, breaks the mold and challenges the status quo, sometimes with sarcasm.",
    },
    archetypes: { it: "Ribelle (Fuorilegge)", en: "Rebel (Outlaw)" },
    example: {
      it: "Le solite regole hanno stancato. È ora di fare di testa propria. Tu da che parte stai?",
      en: "The usual rules have worn out. Time to think for yourself. Which side are you on?",
    },
  },
];

const ToneReferenceTable: React.FC<{ lang: string }> = ({ lang }) => {
  const lk = lang === "it" ? "it" : "en";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);

  // Choose table vs stacked layout based on the real container width
  useEffect(() => {
    if (!open) return;
    const measure = () => setWide((wrapRef.current?.offsetWidth ?? 0) >= 620);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-xl bg-secondary hover:bg-accent transition-colors text-left">
        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Table2 className="w-3.5 h-3.5 text-primary" />
          {lang === "it" ? "Confronta tutti i toni" : "Compare all tones"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div ref={wrapRef}>
        {wide ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="bg-secondary/60 text-left">
                  <th className="px-2.5 py-2 font-medium text-foreground whitespace-nowrap">{lang === "it" ? "Tono" : "Tone"}</th>
                  <th className="px-2.5 py-2 font-medium text-foreground">{lang === "it" ? "Caratteristiche principali" : "Key traits"}</th>
                  <th className="px-2.5 py-2 font-medium text-foreground whitespace-nowrap">{lang === "it" ? "Archetipi associati" : "Archetypes"}</th>
                  <th className="px-2.5 py-2 font-medium text-foreground">{lang === "it" ? "Esempio pratico" : "Example"}</th>
                </tr>
              </thead>
              <tbody>
                {TONE_PRESETS.map((p) => (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="px-2.5 py-2 font-medium text-foreground whitespace-nowrap">{p.fullName[lk]}</td>
                    <td className="px-2.5 py-2 text-muted-foreground">{p.characteristics[lk]}</td>
                    <td className="px-2.5 py-2 text-muted-foreground whitespace-nowrap">{p.archetypes[lk]}</td>
                    <td className="px-2.5 py-2 text-muted-foreground italic">“{p.example[lk]}”</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2">
            {TONE_PRESETS.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-2.5 space-y-1">
                <p className="text-xs font-medium text-foreground">{p.fullName[lk]}</p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">{lang === "it" ? "Caratteristiche" : "Traits"}: </span>
                  {p.characteristics[lk]}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">{lang === "it" ? "Archetipi" : "Archetypes"}: </span>
                  {p.archetypes[lk]}
                </p>
                <p className="text-[11px] text-muted-foreground italic">“{p.example[lk]}”</p>
              </div>
            ))}
          </div>
        )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const STEPS = ["template", "about", "products", "faqs", "tone", "contacts", "review"] as const;
type Step = typeof STEPS[number];

const KnowledgeBaseWizard: React.FC<Props> = ({ clientId, configId, currentKnowledgeBase, plan, vertical, maxFaqs = -1, onSave }) => {
  const { lang } = useLanguage();
  const l = (it: string, en: string) => lang === "it" ? it : en;

  // Only templates matching the client vertical are shown (generic ones are hidden)
  const visibleTemplates = industryTemplates.filter((tmpl) => !!vertical && tmpl.vertical === vertical);
  const singleTemplate = visibleTemplates.length === 1 ? visibleTemplates[0] : null;
  const langKey = lang === "it" ? "it" : "en";

  const [step, setStep] = useState<Step>(singleTemplate ? "about" : "template");
  const [selected, setSelected] = useState<IndustryTemplate | null>(singleTemplate);
  const [sections, setSections] = useState<KBSections>(
    singleTemplate
      ? { ...singleTemplate.sections[langKey] }
      : currentKnowledgeBase
        ? { ...defaultSections, about_us: currentKnowledgeBase }
        : { ...defaultSections }
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
    const validFaqs = sections.faqs.filter(f => f.question.trim() && f.answer.trim());

    if (validFaqs.length > 0) {
      const { data: existing } = await supabase
        .from("faqs")
        .select("question")
        .eq("chatbot_id", configId);
      const existingQuestions = new Set((existing || []).map((f: any) => f.question.toLowerCase().trim()));

      const toInsert = validFaqs.filter(f => !existingQuestions.has(f.question.toLowerCase().trim()));
      const currentCount = existing?.length || 0;
      const room = maxFaqs === -1 ? toInsert.length : Math.max(0, maxFaqs - currentCount);
      const finalInsert = toInsert.slice(0, room);

      if (finalInsert.length > 0) {
        await supabase.from("faqs").insert(
          finalInsert.map(f => ({ chatbot_id: configId, question: f.question, answer: f.answer }))
        );
      }
    }

    const prompt = buildPrompt(sections, lang);
    if (currentKnowledgeBase && prompt.length < currentKnowledgeBase.length / 2) {
      const msg = lang === "it"
        ? "Questo sovrascriverà le istruzioni attuali del bot con un testo più corto. Continuare?"
        : "This will overwrite the bot's current instructions with shorter text. Continue?";
      if (!window.confirm(msg)) {
        setSaving(false);
        return;
      }
    }
    await onSave(prompt);
    setSaving(false);
  };

  const stepIndex = STEPS.indexOf(step);
  const canGoBack = stepIndex > 0 && step !== "template" && !(stepIndex === 1 && singleTemplate);
  const canGoForward = stepIndex < STEPS.length - 1 && step !== "template";

  const goBack = () => {
    if (stepIndex === 1) setStep("template");
    else setStep(STEPS[stepIndex - 1]);
  };
  const goForward = () => setStep(STEPS[stepIndex + 1]);



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
              <div className="flex flex-wrap gap-2">
                {TONE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSectionChange("tone_of_voice", p.text[langKey])}
                    className="rounded-xl px-3 py-2 text-left border border-border bg-secondary/30 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all"
                  >
                    <span className="block text-xs font-medium text-foreground">{p.label[langKey]}</span>
                    <span className="block text-[11px] text-muted-foreground">{p.sub[langKey]}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {l("Cliccando un preset il testo qui sotto viene sostituito: puoi poi modificarlo liberamente.", "Clicking a preset replaces the text below: you can then edit it freely.")}
              </p>
              <Textarea value={sections.tone_of_voice} onChange={(e) => handleSectionChange("tone_of_voice", e.target.value)}
                rows={3} className="bg-secondary border-border resize-none text-sm"
                placeholder={l("Es: professionale ma amichevole...", "E.g.: professional but friendly...")} />
              <ToneReferenceTable lang={lang} />
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
