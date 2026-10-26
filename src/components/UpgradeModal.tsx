import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage, tx } from "@/hooks/useLanguage";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  requiredPlan?: "starter" | "pro";
  variant?: "default" | "rag";
}

export function UpgradeModal({ open, onClose, requiredPlan = "starter", variant = "default" }: UpgradeModalProps) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const planLabel = requiredPlan === "pro" ? "Pro" : "Starter";

  const isRag = variant === "rag";

  const title = isRag
    ? "🔒 Funzionalità Premium"
    : tx("Feature not available", "Funzionalità non disponibile");

  const description = isRag
    ? (tx("Advanced Search (RAG) and document upload are available on the {0} plan. Upgrade to {0} to train your chatbot on your business documents.", "La Ricerca Avanzata (RAG) e il caricamento documenti sono disponibili con il piano {0}. Passa a {0} per addestrare il tuo chatbot sui tuoi documenti aziendali.", [planLabel]))
    : (tx("This feature is available on the {0} plan. Upgrade to unlock it.", "Questa funzione è disponibile dal piano {0}. Fai upgrade per sbloccarla.", [planLabel]));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0"
            onClick={() => {
              onClose();
              navigate("/dashboard/upgrade");
            }}
          >
            {tx("Upgrade to {0} →", "Passa a {0} →", [planLabel])}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onClose();
              navigate("/dashboard/upgrade");
            }}
          >
            {tx("See all plans →", "Scopri tutti i piani →")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            {tx("Not now", "Non ora")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
