import { useState } from "react";
import { KBSections } from "./types";
import { industryTemplates, IndustryTemplate } from "./templates";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  onApply: (sections: KBSections) => void;
}

const IndustryTemplates: React.FC<Props> = ({ onApply }) => {
  const [selected, setSelected] = useState<IndustryTemplate | null>(null);
  const { lang, t } = useLanguage();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {industryTemplates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="p-4 rounded-xl bg-secondary border border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{tmpl.icon}</span>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{tmpl.name[lang]}</h4>
                <p className="text-xs text-muted-foreground">{tmpl.description[lang]}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => setSelected(tmpl)}
            >
              {t("Use Template", "Usa Template")}
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Apply template?", "Applicare il template?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This will overwrite the current content. Continue?",
                "Questo sovrascriverà il contenuto attuale delle sezioni strutturate. Continuare?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel", "Annulla")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selected) onApply(selected.sections[lang]);
                setSelected(null);
              }}
            >
              {t("Continue", "Applica Template")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default IndustryTemplates;
