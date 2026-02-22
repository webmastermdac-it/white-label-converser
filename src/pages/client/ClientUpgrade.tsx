import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";

const ClientUpgrade = () => {
  const { clientId } = useAuth();
  const { t } = useLanguage();
  const { plan: clientPlan } = usePlan();
  const [yearly, setYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const handleUpgrade = async (plan: "starter" | "pro") => {
    const interval = yearly ? "year" : "month";
    setCheckoutLoading(`${plan}-${interval}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (!email) return;
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan, interval, email, client_id: clientId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      price: { month: "0", year: "0" },
      features: [
        t("upgrade1Bot", "1 chatbot"),
        t("upgrade50Conv", "50 conversazioni/mese"),
        t("upgrade10Leads", "10 lead/mese"),
        t("upgradeBranding", "Branding \"Powered by Genius\""),
        t("upgradeBasicKB", "Knowledge base base"),
        t("upgradeEmailSupport", "Supporto email"),
      ],
    },
    {
      id: "starter",
      name: "Starter",
      price: { month: "49", year: "490" },
      features: [
        t("upgrade1Bot", "1 chatbot"),
        t("upgrade500Conv", "500 conversazioni/mese"),
        t("upgradeUnlimitedLeads", "Lead illimitati"),
        t("upgradeNoBranding", "Rimozione branding"),
        t("upgradeDocUpload", "Upload documenti PDF/Word"),
        t("upgradeSectorTemplates", "Template per settore"),
        t("upgradePrioritySupport", "Supporto prioritario"),
      ],
    },
    {
      id: "pro",
      name: "Pro",
      popular: true,
      price: { month: "149", year: "1490" },
      features: [
        t("upgradeUnlimitedBots", "Chatbot illimitati"),
        t("upgradeUnlimitedConv", "Conversazioni illimitate"),
        t("upgradeUnlimitedLeads", "Lead illimitati"),
        t("upgradeAllFeatures", "Tutte le funzionalità Pro"),
        t("upgradeAdvancedAnalytics", "Analytics avanzate"),
        t("upgradeDedicatedSupport", "Supporto dedicato"),
      ],
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
          {t("upgradeTitle")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("upgradeDesc")}</p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>
          {t("upgradeMonthly", "Mensile")}
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative w-14 h-7 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-muted"}`}
        >
          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${yearly ? "translate-x-7" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
          {t("upgradeYearly", "Annuale")}
        </span>
        {yearly && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">-17%</span>}
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === clientPlan;
          const canUpgrade = !isCurrent && plan.id !== "free" && (
            clientPlan === "free" || (clientPlan === "starter" && plan.id === "pro")
          );

          return (
            <div
              key={plan.id}
              className={`glass rounded-xl p-6 space-y-5 relative ${
                plan.popular ? "border-primary/40 ring-1 ring-primary/20" : ""
              } ${isCurrent ? "border-primary/60 ring-2 ring-primary/30" : ""}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t("upgradeCurrentPlan", "Piano attuale")}
                </div>
              )}
              {plan.popular && !isCurrent && (
                <div className="absolute -top-3 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t("upgradeMostPopular", "Più Popolare")}
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
                  {plan.name}
                </h3>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    €{yearly ? plan.price.year : plan.price.month}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    /{yearly ? t("upgradeYear", "anno") : t("upgradeMonth", "mese")}
                  </span>
                </div>
              </div>

              <ul className="space-y-2 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {canUpgrade ? (
                <Button
                  className="w-full gradient-primary text-white border-0"
                  onClick={() => handleUpgrade(plan.id as "starter" | "pro")}
                  disabled={!!checkoutLoading}
                >
                  {checkoutLoading?.startsWith(plan.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `${t("upgradeUpgradeTo", "Passa a")} ${plan.name}`
                  )}
                </Button>
              ) : isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  {t("upgradeCurrentPlan", "Piano attuale")}
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  {plan.id === "free" ? t("upgradeIncluded", "Incluso") : t("upgradeUpgradeTo", "Passa a") + " " + plan.name}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Coupon */}
      <div className="glass rounded-xl p-4">
        <label className="text-sm text-muted-foreground block mb-2">
          {t("upgradeCoupon", "Hai già un codice sconto?")}
        </label>
        <div className="flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder={t("upgradeCouponPlaceholder", "Inserisci il codice...")}
            className="bg-secondary border-border text-base"
          />
          <Button variant="outline" disabled={!couponCode.trim()}>
            {t("upgradeApply", "Applica")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientUpgrade;
