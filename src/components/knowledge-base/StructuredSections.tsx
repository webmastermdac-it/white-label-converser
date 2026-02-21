import { useState } from "react";
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
import { ChevronDown, Plus, Trash2 } from "lucide-react";

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
          <CollapsibleContent className="pt-3 px-1">
            <Textarea
              value={(sections[def.key] as string) || ""}
              onChange={(e) => updateField(def.key, e.target.value)}
              onBlur={onBlurSave}
              placeholder={def.placeholder}
              rows={5}
              className="bg-secondary border-border resize-none text-sm"
            />
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
