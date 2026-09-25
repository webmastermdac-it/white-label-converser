import { useEffect, useRef, useState } from "react";
import { KBSections } from "./types";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Plus, Table2, Trash2 } from "lucide-react";

interface Props {
  sections: KBSections;
  onChange: (sections: KBSections) => void;
  onBlurSave: () => void;
}

const sectionDefs = [
  {
    key: "about_us" as const,
    icon: "🏢",
    title: "Chi siamo / About Us",
    placeholder:
      "Descrivi l'azienda, la storia, i valori, la mission...",
  },
  {
    key: "products_services" as const,
    icon: "🛍️",
    title: "Prodotti & Servizi",
    placeholder:
      "Elenca tutti i servizi/prodotti con descrizioni, prezzi, caratteristiche...",
  },
  {
    key: "tone_of_voice" as const,
    icon: "🎭",
    title: "Tono di Voce",
    placeholder:
      "Formale o informale? Usa emoji? Come si chiama il bot? Esempi di frasi che deve usare e NON deve usare...",
  },
  {
    key: "forbidden_topics" as const,
    icon: "🚫",
    title: "Argomenti Vietati",
    placeholder:
      "Argomenti di cui il bot non deve parlare. Es: prezzi dei competitor, argomenti politici...",
  },
  {
    key: "contacts_hours" as const,
    icon: "📞",
    title: "Contatti & Orari",
    placeholder:
      "Telefono, email, indirizzo, orari di apertura, tempi di risposta...",
  },
];

type TonePreset = {
  id: string;
  label: string;
  sub: string;
  fullName: string;
  text: string;
  characteristics: string;
  archetypes: string;
  example: string;
};

const TONE_PRESETS: TonePreset[] = [
  {
    id: "istituzionale",
    label: "Istituzionale",
    sub: "Preciso, autorevole, il Lei",
    fullName: "Istituzionale / Formale",
    text: `Tono istituzionale e formale: linguaggio preciso e autorevole, terza persona o forma di cortesia ("Lei"), evita slang e abbreviazioni. Esempio: "La ringraziamo per aver scelto i nostri servizi. La vostra sicurezza è la nostra priorità."`,
    characteristics: `Linguaggio preciso, autorevole, uso della terza persona o del "Lei". Evita slang e abbreviazioni.`,
    archetypes: "Sovrano, Saggio",
    example: "La ringraziamo per aver scelto i nostri servizi. La vostra sicurezza è la nostra priorità.",
  },
  {
    id: "amichevole",
    label: "Amichevole",
    sub: "Caldo, colloquiale, il tu",
    fullName: "Amichevole / Informale",
    text: `Tono amichevole e informale: caldo, accessibile, usa il "tu" e un linguaggio colloquiale ma curato. Esempio: "Ciao! Siamo felici di averti qui. Mettiti comodo, pensiamo a tutto noi."`,
    characteristics: `Caldo, accessibile, usa il "tu" e un linguaggio colloquiale ma curato.`,
    archetypes: "Uomo Comune, Innocente",
    example: "Ciao! Siamo felici di averti qui. Mettiti comodo, pensiamo a tutto noi.",
  },
  {
    id: "ironico",
    label: "Ironico",
    sub: "Giocoso, battute leggere",
    fullName: "Ironico / Divertente",
    text: `Tono ironico e divertente: giocoso, leggero, fa uso di battute, giochi di parole e piccole storie per intrattenere. Esempio: "Sappiamo che odi i lunedì. Ecco qualcosa che ti farà sorridere (o almeno ci prova)."`,
    characteristics: "Giocoso, leggero, fa uso di battute, giochi di parole e storielle per intrattenere.",
    archetypes: "Burlone (Jester)",
    example: "Sappiamo che odi i lunedì. Ecco qualcosa che ti farà sorridere (o almeno ci prova).",
  },
  {
    id: "ispirazionale",
    label: "Ispirazionale",
    sub: "Motivante, epico",
    fullName: "Ispirazionale / Epico",
    text: `Tono ispirazionale ed epico: evocativo, motivante, orientato al superamento dei limiti e al cambiamento. Esempio: "Il futuro non si aspetta, si costruisce. Abbatti le barriere e libera il tuo potenziale."`,
    characteristics: "Evocativo, motivante, orientato al superamento dei limiti e al cambiamento.",
    archetypes: "Eroe, Ribelle",
    example: "Il futuro non si aspetta, si costruisce. Abbatti le barriere e libera il tuo potenziale.",
  },
  {
    id: "tecnico",
    label: "Tecnico",
    sub: "Dati, precisione, oggettività",
    fullName: "Tecnico / Specialistico",
    text: `Tono tecnico e specialistico: focalizzato su dati, precisione, termini di settore e oggettività. Esempio: "Il nuovo algoritmo ottimizza l'efficienza energetica del 42% riducendo i tempi di latenza."`,
    characteristics: "Focalizzato su dati, precisione scientifica, termini di settore e oggettività.",
    archetypes: "Creatore, Saggio",
    example: "Il nuovo algoritmo ottimizza l'efficienza energetica del 42% riducendo i tempi di latenza.",
  },
  {
    id: "irriverente",
    label: "Irriverente",
    sub: "Diretto, provocatorio",
    fullName: "Irriverente / Provocatorio",
    text: `Tono irriverente e provocatorio: diretto, audace, rompe gli schemi e sfida lo status quo, a volte con sarcasmo. Esempio: "Le solite regole hanno stancato. È ora di fare di testa propria. Tu da che parte stai?"`,
    characteristics: "Diretto, audace, rompe gli schemi e sfida lo status quo, a volte usando il sarcasmo.",
    archetypes: "Ribelle (Fuorilegge)",
    example: "Le solite regole hanno stancato. È ora di fare di testa propria. Tu da che parte stai?",
  },
];

const ToneReferenceTable = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (!open) return;
    const element = wrapRef.current;
    if (!element) return;
    const measure = () => setWide(element.offsetWidth >= 620);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-xl bg-secondary hover:bg-accent transition-colors text-left">
        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Table2 className="w-3.5 h-3.5 text-primary" />
          Confronta tutti i toni
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div ref={wrapRef}>
          {wide ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[600px] text-xs">
                <thead>
                  <tr className="bg-secondary/60 text-left">
                    <th className="px-2.5 py-2 font-medium text-foreground whitespace-nowrap">Tono</th>
                    <th className="px-2.5 py-2 font-medium text-foreground">Caratteristiche principali</th>
                    <th className="px-2.5 py-2 font-medium text-foreground whitespace-nowrap">Archetipi associati</th>
                    <th className="px-2.5 py-2 font-medium text-foreground">Esempio pratico</th>
                  </tr>
                </thead>
                <tbody>
                  {TONE_PRESETS.map((preset) => (
                    <tr key={preset.id} className="border-t border-border align-top">
                      <td className="px-2.5 py-2 font-medium text-foreground whitespace-nowrap">{preset.fullName}</td>
                      <td className="px-2.5 py-2 text-muted-foreground">{preset.characteristics}</td>
                      <td className="px-2.5 py-2 text-muted-foreground whitespace-nowrap">{preset.archetypes}</td>
                      <td className="px-2.5 py-2 text-muted-foreground italic">“{preset.example}”</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-2">
              {TONE_PRESETS.map((preset) => (
                <div key={preset.id} className="rounded-lg border border-border p-2.5 space-y-1">
                  <p className="text-xs font-medium text-foreground">{preset.fullName}</p>
                  <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Caratteristiche: </span>{preset.characteristics}</p>
                  <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Archetipi: </span>{preset.archetypes}</p>
                  <p className="text-[11px] text-muted-foreground italic">“{preset.example}”</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const StructuredSections: React.FC<Props> = ({ sections, onChange, onBlurSave }) => {
  const [openSections, setOpenSections] = useState<string[]>(["about_us"]);

  const toggle = (key: string) => {
    setOpenSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const updateField = (key: keyof KBSections, value: any) => {
    onChange({ ...sections, [key]: value });
  };

  const addFaq = () => {
    updateField("faqs", [...(sections.faqs || []), { question: "", answer: "" }]);
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...(sections.faqs || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("faqs", updated);
  };

  const removeFaq = (index: number) => {
    updateField("faqs", sections.faqs.filter((_, i) => i !== index));
    onBlurSave();
  };

  return (
    <div className="space-y-3">
      {sectionDefs.map((def) => (
        <Collapsible
          key={def.key}
          open={openSections.includes(def.key)}
          onOpenChange={() => toggle(def.key)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl bg-secondary hover:bg-accent transition-colors text-left">
            <span className="flex items-center gap-2 font-medium text-sm text-foreground">
              <span>{def.icon}</span>
              {def.title}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                openSections.includes(def.key) ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 px-1 space-y-3">
            {def.key === "tone_of_voice" && (
              <div className="flex flex-wrap gap-2">
                {TONE_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      updateField("tone_of_voice", preset.text);
                      onBlurSave();
                    }}
                    className="h-auto min-w-[145px] flex-1 justify-start rounded-lg px-3 py-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-foreground">{preset.label}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">{preset.sub}</span>
                    </span>
                  </Button>
                ))}
              </div>
            )}
            <Textarea
              value={(sections[def.key] as string) || ""}
              onChange={(e) => updateField(def.key, e.target.value)}
              onBlur={onBlurSave}
              placeholder={def.placeholder}
              rows={5}
              className="bg-secondary border-border resize-none text-sm"
            />
            {def.key === "tone_of_voice" && <ToneReferenceTable />}
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* FAQ Section */}
      <Collapsible
        open={openSections.includes("faqs")}
        onOpenChange={() => toggle("faqs")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl bg-secondary hover:bg-accent transition-colors text-left">
          <span className="flex items-center gap-2 font-medium text-sm text-foreground">
            <span>❓</span>
            FAQ
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              openSections.includes("faqs") ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 px-1 space-y-3">
          {(sections.faqs || []).map((faq, i) => (
            <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={faq.question}
                    onChange={(e) => updateFaq(i, "question", e.target.value)}
                    onBlur={onBlurSave}
                    placeholder={`Domanda ${i + 1}`}
                    className="bg-secondary border-border text-sm"
                  />
                  <Textarea
                    value={faq.answer}
                    onChange={(e) => updateFaq(i, "answer", e.target.value)}
                    onBlur={onBlurSave}
                    placeholder="Risposta..."
                    rows={2}
                    className="bg-secondary border-border resize-none text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFaq(i)}
                  className="text-muted-foreground hover:text-destructive shrink-0 mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addFaq} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Aggiungi Domanda
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default StructuredSections;
