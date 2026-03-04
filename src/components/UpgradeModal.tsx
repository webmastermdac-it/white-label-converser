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
import { useLanguage } from "@/hooks/useLanguage";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  requiredPlan?: "starter" | "pro";
  variant?: "default" | "rag";
}

export function UpgradeModal({ open, onClose, requiredPlan = "starter", variant = "default" }: UpgradeModalProps) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isIt = lang === "it";
  const planLabel = requiredPlan === "pro" ? "Pro" : "Starter";

  const isRag = variant === "rag";

  const title = isRag
    ? "🔒 Funzionalità Premium"
    : isIt ? "Funzionalità non disponibile" : "Feature not available";

  const description = isRag
    ? (isIt
        ? "La Ricerca Avanzata (RAG) e il caricamento documenti sono disponibili dal piano Starter a €49/mese. Fai upgrade per addestrare il tuo chatbot sui tuoi documenti aziendali."
        : "Advanced Search (RAG) and document upload are available on the Starter plan at €49/month. Upgrade to train your chatbot on your business documents.")
    : (isIt
        ? `Questa funzione è disponibile dal piano ${planLabel}. Fai upgrade per sbloccarla.`
        : `This feature is available on the ${planLabel} plan. Upgrade to unlock it.`);

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
            {isIt ? "Fai Upgrade a Starter →" : "Upgrade to Starter →"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onClose();
              navigate("/dashboard/upgrade");
            }}
          >
            {isIt ? "Scopri tutti i piani →" : "See all plans →"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            {isIt ? "Non ora" : "Not now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
