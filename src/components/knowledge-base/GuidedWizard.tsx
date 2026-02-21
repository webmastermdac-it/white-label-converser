import { useState } from "react";
import { KBSections } from "./types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, Sparkles } from "lucide-react";

interface Props {
  onComplete: (sections: KBSections) => void;
}

interface WizardStep {
  id: string;
  question: string;
  placeholder: string;
  type: "text" | "textarea";
}

const baseSteps: WizardStep[] = [
  {
    id: "company",
    question: "Come si chiama la tua azienda e cosa fa?",
    placeholder: "Es: Acme Corp, sviluppiamo software per ristoranti...",
    type: "textarea",
  },
  {
    id: "products",
    question: "Quali sono i tuoi 3 prodotti/servizi principali?",
    placeholder: "1. ...\n2. ...\n3. ...",
    type: "textarea",
  },
  {
    id: "ideal_client",
    question: "Qual è il tuo cliente ideale?",
    placeholder: "Es: Ristoranti e pizzerie con 20-100 coperti...",
    type: "textarea",
  },
  {
    id: "forbidden",
    question: "Ci sono argomenti di cui il bot NON deve parlare?",
    placeholder: "Es: Prezzi competitor, politica, offerte non autorizzate...",
    type: "textarea",
  },
  {
    id: "tone",
    question: "Come vuoi che si chiami il bot e che tono deve usare?",
    placeholder: "Es: 'Gino', tono amichevole e informale, usa emoji...",
    type: "textarea",
  },
];

const GuidedWizard: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [faqStep, setFaqStep] = useState<"questions" | "answers" | null>(null);
  const [faqQuestions, setFaqQuestions] = useState<string>("");
  const [faqAnswers, setFaqAnswers] = useState<Record<number, string>>({});
  const [completed, setCompleted] = useState(false);

  const totalSteps = baseSteps.length + 1; // +1 for FAQ
  const currentBaseStep = step < 3 ? step : step > 3 ? step - 1 : -1;
  const isFaqStep = step === 3;

  const currentStep = !isFaqStep && currentBaseStep >= 0 ? baseSteps[currentBaseStep] : null;

  const handleNext = () => {
    if (step === 3 && faqStep === null) {
      setFaqStep("questions");
      return;
    }
    if (step === 3 && faqStep === "questions") {
      setFaqStep("answers");
      return;
    }
    if (step === 3 && faqStep === "answers") {
      setFaqStep(null);
      setStep(step + 1);
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const canProceed = () => {
    if (isFaqStep) return true;
    if (currentStep) return (answers[currentStep.id] || "").trim().length > 0;
    return true;
  };

  const parsedQuestions = faqQuestions
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);

  const generateKB = () => {
    const faqs = parsedQuestions.map((q, i) => ({
      question: q,
      answer: faqAnswers[i] || "",
    }));

    const sections: KBSections = {
      about_us: answers.company || "",
      products_services: answers.products || "",
      faqs,
      tone_of_voice: `Cliente ideale: ${answers.ideal_client || ""}\n\n${answers.tone || ""}`,
      forbidden_topics: answers.forbidden || "",
      contacts_hours: "",
    };

    setCompleted(true);
    setTimeout(() => onComplete(sections), 1500);
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Knowledge Base Generata!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Le sezioni strutturate sono state aggiornate.
        </p>
      </div>
    );
  }

  const isLastStep = step === totalSteps - 1 && !isFaqStep;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Previous answers */}
      {step > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {baseSteps.slice(0, Math.min(step, 3)).map((s) =>
            answers[s.id] ? (
              <div key={s.id} className="text-xs p-2 rounded-lg bg-secondary/50 border border-border">
                <span className="text-muted-foreground">{s.question}</span>
                <p className="text-foreground mt-0.5 line-clamp-2">{answers[s.id]}</p>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Current question */}
      {currentStep && !isFaqStep && (
        <div className="space-y-3 animate-fade-in-up">
          <h3 className="text-base font-semibold text-foreground">{currentStep.question}</h3>
          <Textarea
            value={answers[currentStep.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [currentStep.id]: e.target.value })}
            placeholder={currentStep.placeholder}
            rows={4}
            className="bg-secondary border-border resize-none"
            autoFocus
          />
        </div>
      )}

      {/* FAQ Step */}
      {isFaqStep && faqStep === "questions" && (
        <div className="space-y-3 animate-fade-in-up">
          <h3 className="text-base font-semibold text-foreground">
            Quali sono le 5 domande che ti fanno più spesso i clienti?
          </h3>
          <Textarea
            value={faqQuestions}
            onChange={(e) => setFaqQuestions(e.target.value)}
            placeholder={"Una domanda per riga:\nQuanto costa?\nCome prenoto?\n..."}
            rows={6}
            className="bg-secondary border-border resize-none"
            autoFocus
          />
        </div>
      )}

      {isFaqStep && faqStep === "answers" && (
        <div className="space-y-3 animate-fade-in-up">
          <h3 className="text-base font-semibold text-foreground">
            Qual è la risposta a ciascuna domanda?
          </h3>
          {parsedQuestions.map((q, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm text-foreground font-medium">D: {q}</p>
              <Textarea
                value={faqAnswers[i] || ""}
                onChange={(e) => setFaqAnswers({ ...faqAnswers, [i]: e.target.value })}
                placeholder="Risposta..."
                rows={2}
                className="bg-secondary border-border resize-none text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end">
        {isLastStep ? (
          <Button onClick={generateKB} className="gradient-primary text-white border-0">
            <Sparkles className="w-4 h-4 mr-1" /> Genera Knowledge Base
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Avanti <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default GuidedWizard;
