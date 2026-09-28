import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { MODULES, MODULE_IDS, toModuleId, type ModuleId } from "@/lib/modules";
import { MODULE_CHANGED_EVENT } from "@/hooks/useActiveModule";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BotModuleCardProps {
  chatbotId: string;
  canChange: boolean;
}

const BotModuleCard = ({ chatbotId, canChange }: BotModuleCardProps) => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [current, setCurrent] = useState<ModuleId | null>(null);
  const [picking, setPicking] = useState(false);
  const [pendingModule, setPendingModule] = useState<ModuleId | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from("chatbot_configs").select("business_vertical").eq("id", chatbotId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setCurrent(toModuleId((data as any)?.business_vertical)); });
    return () => { cancelled = true; };
  }, [chatbotId]);

  const confirmModuleChange = async () => {
    if (!pendingModule) return;
    const next = pendingModule;
    setPendingModule(null);
    const { error } = await supabase.from("chatbot_configs").update({ business_vertical: next }).eq("id", chatbotId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setCurrent(next);
    setPicking(false);
    window.dispatchEvent(new Event(MODULE_CHANGED_EVENT));
    toast({ title: lang === "it" ? "Modulo aggiornato" : "Module updated" });
  };

  const m = current ? MODULES[current] : null;

  return (
    <div className="glass space-y-4 rounded-xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {m && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `hsl(${m.color} / 0.15)` }}>
              <m.icon className="h-5 w-5" style={{ color: `hsl(${m.color})` }} />
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">{lang === "it" ? "Tipo di bot" : "Bot type"}</p>
            <p className="font-semibold text-foreground">{m ? m.name[lang] : "…"}</p>
            {m && <p className="text-sm text-muted-foreground">{m.description[lang]}</p>}
          </div>
        </div>
        {canChange && (
          <Button variant="outline" size="sm" onClick={() => setPicking((p) => !p)}>
            {lang === "it" ? "Cambia tipo" : "Change type"}
          </Button>
        )}
      </div>

      {!canChange && (
        <p className="text-xs text-muted-foreground">
          {lang === "it"
            ? "Il tipo di bot è impostato dal tuo consulente. Per cambiarlo contatta il supporto."
            : "The bot type is set by your consultant. To change it, contact support."}
        </p>
      )}

      {canChange && picking && (
        <div className="grid grid-cols-2 gap-2">
          {MODULE_IDS.map((id) => {
            const mod = MODULES[id];
            const active = current === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { if (!active) setPendingModule(id); }}
                className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                  active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                }`}
              >
                <mod.icon className="h-4 w-4 shrink-0" style={{ color: `hsl(${mod.color})` }} />
                <span>{mod.name[lang]}</span>
              </button>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pendingModule} onOpenChange={(o) => !o && setPendingModule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "it" ? "Cambiare modulo?" : "Change module?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingModule && (lang === "it"
                ? `Il bot passerà al modulo "${MODULES[pendingModule].name.it}". Menu, checklist e integrazioni consigliate cambieranno. Dati e contenuti già salvati restano invariati.`
                : `The bot will switch to the "${MODULES[pendingModule].name.en}" module. Menu, checklist and recommended integrations will change. Saved data and content stay unchanged.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "it" ? "Annulla" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmModuleChange}>{lang === "it" ? "Conferma" : "Confirm"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BotModuleCard;
