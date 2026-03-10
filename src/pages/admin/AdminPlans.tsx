import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface PlanRow {
  id: string;
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  max_chatbots: number;
  max_conversations_month: number;
  max_leads_month: number;
  max_faqs: number;
  max_documents: number;
  remove_branding: boolean;
  doc_upload: boolean;
  sector_templates: boolean;
  calendly_integration: boolean;
  advanced_analytics: boolean;
  priority_support: boolean;
  knowledge_base_wizard: boolean;
  ecommerce_integration: boolean;
  updated_at: string;
}

const PLAN_ORDER = ["free", "starter", "pro"];
const PLAN_COLORS: Record<string, string> = {
  free: "#6B7280",
  starter: "#3B82F6",
  pro: "#F59E0B",
};
const PLAN_EMOJI: Record<string, string> = {
  free: "🆓",
  starter: "🚀",
  pro: "👑",
};

const FEATURE_KEYS: { key: keyof PlanRow; label: string }[] = [
  { key: "remove_branding", label: "Rimozione branding" },
  { key: "doc_upload", label: "Upload documenti" },
  { key: "sector_templates", label: "Template settore" },
  { key: "calendly_integration", label: "Integrazione Calendly" },
  { key: "advanced_analytics", label: "Analytics avanzate" },
  { key: "priority_support", label: "Supporto prioritario" },
  { key: "knowledge_base_wizard", label: "Wizard knowledge base" },
  { key: "ecommerce_integration", label: "Integrazione Ecommerce" },
];

// Features that have enforcement in the app
const ENFORCED_FEATURES = new Set([
  "remove_branding",
  "doc_upload",
  "sector_templates",
  "calendly_integration",
  "knowledge_base_wizard",
  "ecommerce_integration",
  "max_chatbots",
  "max_conversations_month",
  "max_leads_month",
  "max_faqs",
]);

const AdminPlans = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, PlanRow>>({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("plan_configs" as any)
      .select("*")
      .order("price_monthly", { ascending: true });

    if (data) {
      const sorted = (data as any as PlanRow[]).sort(
        (a, b) => PLAN_ORDER.indexOf(a.plan_name) - PLAN_ORDER.indexOf(b.plan_name)
      );
      setPlans(sorted);
    }
    setLoading(false);
  };

  const getCurrent = (plan: PlanRow): PlanRow => edited[plan.id] || plan;

  const update = (plan: PlanRow, key: keyof PlanRow, value: any) => {
    setEdited((prev) => ({
      ...prev,
      [plan.id]: { ...(prev[plan.id] || plan), [key]: value },
    }));
  };

  const handleSave = async (plan: PlanRow) => {
    const current = getCurrent(plan);
    setSavingId(plan.id);

    const { error } = await supabase
      .from("plan_configs" as any)
      .update({
        price_monthly: current.price_monthly,
        price_yearly: current.price_yearly,
        max_chatbots: current.max_chatbots,
        max_conversations_month: current.max_conversations_month,
        max_leads_month: current.max_leads_month,
        max_faqs: current.max_faqs,
        max_documents: current.max_documents,
        remove_branding: current.remove_branding,
        doc_upload: current.doc_upload,
        sector_templates: current.sector_templates,
        calendly_integration: current.calendly_integration,
        advanced_analytics: current.advanced_analytics,
        priority_support: current.priority_support,
        knowledge_base_wizard: current.knowledge_base_wizard,
        ecommerce_integration: current.ecommerce_integration,
      } as any)
      .eq("id", plan.id);

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Piano ${current.plan_name} aggiornato!` });
      setEdited((prev) => {
        const next = { ...prev };
        delete next[plan.id];
        return next;
      });
      fetchPlans();
    }
    setSavingId(null);
  };

  // Consistency check
  const unenforced = FEATURE_KEYS.filter((f) => !ENFORCED_FEATURES.has(f.key));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
          Gestione Piani
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura limiti e funzionalità per ogni piano.
        </p>
      </div>

      {unenforced.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              ⚠️ Attenzione: alcune funzionalità potrebbero non essere ancora collegate al sistema di controllo.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Flag non ancora applicati: {unenforced.map((f) => f.label).join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const current = getCurrent(plan);
          const color = PLAN_COLORS[plan.plan_name] || "#6B7280";
          const isDirty = !!edited[plan.id];

          return (
            <div key={plan.id} className="glass rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4" style={{ background: `${color}20`, borderBottom: `2px solid ${color}40` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{PLAN_EMOJI[plan.plan_name]}</span>
                  <h3 className="text-lg font-bold text-foreground uppercase" style={{ fontFamily: "Syne, sans-serif" }}>
                    {plan.plan_name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  €{(current.price_monthly / 100).toFixed(0)} / mese · €{(current.price_yearly / 100).toFixed(0)} / anno
                </p>
              </div>

              <div className="p-5 space-y-5">
                {/* Numeric Limits */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Limiti numerici</h4>

                    {[
                      { key: "max_chatbots" as keyof PlanRow, label: "Chatbot max" },
                      { key: "max_conversations_month" as keyof PlanRow, label: "Conv/mese" },
                      { key: "max_leads_month" as keyof PlanRow, label: "Lead/mese" },
                      { key: "max_faqs" as keyof PlanRow, label: "FAQ max" },
                      { key: "max_documents" as keyof PlanRow, label: "Documenti max" },
                    ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <Label className="text-sm text-foreground">{label}</Label>
                      <Input
                        type="number"
                        min={-1}
                        value={current[key] as number}
                        onChange={(e) => update(plan, key, parseInt(e.target.value) || 0)}
                        className="w-24 bg-secondary border-border text-sm text-right"
                      />
                    </div>
                  ))}

                  <p className="text-xs text-muted-foreground italic">Usa -1 per illimitato</p>
                </div>

                {/* Feature Flags */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Funzionalità</h4>

                  {FEATURE_KEYS.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm text-foreground">{label}</Label>
                      <Switch
                        checked={current[key] as boolean}
                        onCheckedChange={(val) => update(plan, key, val)}
                      />
                    </div>
                  ))}
                </div>

                {/* Save */}
                <Button
                  className="w-full"
                  onClick={() => handleSave(plan)}
                  disabled={savingId === plan.id || !isDirty}
                  variant={isDirty ? "default" : "outline"}
                >
                  {savingId === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  💾 Salva modifiche
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Ultimo aggiornamento: {format(new Date(plan.updated_at), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPlans;
