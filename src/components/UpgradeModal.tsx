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
}

export function UpgradeModal({ open, onClose, requiredPlan = "starter" }: UpgradeModalProps) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isIt = lang === "it";
  const planLabel = requiredPlan === "pro" ? "Pro" : "Starter";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {isIt ? "Funzionalità non disponibile" : "Feature not available"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isIt
              ? `Questa funzione è disponibile dal piano ${planLabel}. Fai upgrade per sbloccarla.`
              : `This feature is available on the ${planLabel} plan. Upgrade to unlock it.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full gradient-primary text-white"
            onClick={() => {
              onClose();
              navigate("/dashboard/upgrade");
            }}
          >
            {isIt ? "Fai Upgrade →" : "Upgrade →"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            {isIt ? "Non ora" : "Not now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
