import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Lock } from "lucide-react";

// RAGInfoTooltip removed — replaced with inline description

const ClientUpgrade = () => {
  const { clientId } = useAuth();
  const { lang } = useLanguage();
  const { plan: clientPlan } = usePlan();
  const [yearly, setYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const isIt = lang === "it";

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
        "1 chatbot",
        isIt ? "50 conversazioni/mese" : "50 conversations/month",
        isIt ? "10 lead/mese" : "10 leads/month",
        isIt ? "Prompt di sistema (tono e ruolo del bot)" : "System prompt (tone & bot role)",
        isIt ? "5 FAQ manuali" : "5 manual FAQs",
        isIt ? "Raccolta contatti in chat (nome + email o telefono)" : "Lead capture in chat (name + email or phone)",
        isIt ? "Risposte multilingua" : "Multilingual replies",
        isIt ? "Supporto email" : "Email support",
      ],
      lockedFeatures: [
        isIt ? "Upload PDF/Word" : "PDF/Word upload",
        isIt ? "Ricerca Avanzata RAG" : "Advanced Search RAG",
        isIt ? "Integrazioni ecommerce" : "Ecommerce integrations",
        isIt ? "Modulo Concierge Hotel" : "Hotel Concierge module",
      ],
      rag: "locked" as const,
      brandingFooter: "Free Chatbot Genius",
    },
    {
      id: "starter",
      name: "Starter",
      price: { month: "49", year: "490" },
      features: [
        "1 chatbot",
        isIt ? "500 conversazioni/mese" : "500 conversations/month",
        isIt ? "Lead illimitati" : "Unlimited leads",
        isIt ? "Prompt di sistema avanzato" : "Advanced system prompt",
        isIt ? "FAQ illimitate" : "Unlimited FAQs",
        isIt ? "Upload PDF/Word" : "PDF/Word upload",
        isIt ? "Importazione pagine del sito e sitemap" : "Website pages and sitemap import",
        isIt ? "Template di settore" : "Industry templates",
        isIt ? "Integrazione Calendly per gli appuntamenti" : "Calendly integration for appointments",
        isIt ? "Supporto prioritario" : "Priority support",
        isIt ? "🔍 Ricerca Avanzata (RAG)" : "🔍 Advanced Search (RAG)",
        isIt ? "🛒 Feed XML/CSV (sync giornaliero)" : "🛒 XML/CSV Feed (daily sync)",
        isIt ? "Fino a 100 prodotti ecommerce" : "Up to 100 ecommerce products",
      ],
      lockedFeatures: [
        isIt ? "Analytics avanzati" : "Advanced analytics",
        isIt ? "Ecommerce completo con webhook real-time" : "Full ecommerce with real-time webhooks",
        isIt ? "Modulo Concierge Hotel" : "Hotel Concierge module",
      ],
      rag: "included" as const,
      brandingFooter: "Chatbot Genius",
    },
    {
      id: "pro",
      name: "Pro",
      popular: true,
      price: { month: "149", year: "1490" },
      features: [
        isIt ? "1 chatbot personalizzato per il tuo settore" : "1 custom chatbot for your business type",
        isIt ? "Conversazioni illimitate" : "Unlimited conversations",
        isIt ? "Lead illimitati" : "Unlimited leads",
        isIt ? "Tutte le funzionalità Starter" : "All Starter features",
        isIt ? "🔍 Ricerca Avanzata (RAG) — in evidenza" : "🔍 Advanced Search (RAG) — highlighted",
        isIt ? "🛒 Ecommerce completo (WooCommerce, Shopify, PrestaShop, API + webhook real-time)" : "🛒 Full ecommerce (WooCommerce, Shopify, PrestaShop, API + real-time webhooks)",
        isIt ? "Prodotti ecommerce illimitati" : "Unlimited ecommerce products",
        isIt ? "🏨 Concierge Hotel: preventivi soggiorno, QR per le camere, richieste ospiti in tempo reale, pagina Risultati" : "🏨 Hotel Concierge: stay quotes, room QR codes, real-time guest requests, Results page",
        isIt ? "📱 Canale Instagram DM" : "📱 Instagram DM channel",
        isIt ? "⏱️ Chiusura automatica chat inattive con email di riepilogo" : "⏱️ Auto-close inactive chats with recap email",
        isIt ? "Analytics avanzati" : "Advanced analytics",
        isIt ? "White label completo" : "Complete white label",
        isIt ? "Supporto dedicato" : "Dedicated support",
      ],
      lockedFeatures: [],
      rag: "highlighted" as const,
      brandingFooter: "Chatbot Genius",
    },
  ];


  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
          {isIt ? "Scegli il tuo piano" : "Choose your plan"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isIt ? "Inizia gratis, passa a un piano superiore quando sei pronto." : "Start free, upgrade when you're ready."}
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>
          {isIt ? "Mensile" : "Monthly"}
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative w-14 h-7 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-muted"}`}
        >
          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${yearly ? "translate-x-7" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
          {isIt ? "Annuale" : "Yearly"}
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
              className={`glass rounded-xl p-6 space-y-5 relative flex flex-col ${
                plan.popular ? "border-primary/40 ring-1 ring-primary/20" : ""
              } ${isCurrent ? "border-primary/60 ring-2 ring-primary/30" : ""}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  {isIt ? "Piano attuale" : "Current plan"}
                </div>
              )}
              {plan.popular && !isCurrent && (
                <div className="absolute -top-3 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  {isIt ? "Più Popolare" : "Most Popular"}
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
                    /{yearly ? (isIt ? "anno" : "year") : (isIt ? "mese" : "month")}
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
                {plan.lockedFeatures.map((f, i) => (
                  <li key={`lock-${i}`} className="flex items-start gap-2 text-muted-foreground/40">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    🔒 {f}
                  </li>
                ))}
              </ul>

              {/* RAG Section */}
              <div className={`mt-auto pt-4 border-t ${plan.rag === "highlighted" ? "border-primary/30" : "border-border"}`}>
                <div className="mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    plan.rag === "locked" ? "text-muted-foreground/50" : plan.rag === "highlighted" ? "text-primary" : "text-primary/70"
                  }`}>
                    🔍 {isIt ? "Ricerca Avanzata (RAG)" : "Advanced Search (RAG)"}
                  </span>
                  <p style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>{isIt ? "Addestra il chatbot sui tuoi documenti e PDF" : "Train your chatbot on your documents and PDFs"}</p>
                </div>
                {plan.rag === "locked" ? (
                  <div className="flex items-center gap-2 text-muted-foreground/50 text-sm">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>{isIt ? "Bloccato – fai upgrade" : "Locked – upgrade to unlock"}</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 text-sm ${plan.rag === "highlighted" ? "text-primary font-medium" : "text-primary"}`}>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{plan.rag === "highlighted" ? (isIt ? "Incluso + Priorità" : "Included + Priority") : (isIt ? "Incluso" : "Included")}</span>
                  </div>
                )}
              </div>

              {canUpgrade ? (
                <Button
                  className="w-full gradient-primary text-white border-0"
                  onClick={() => handleUpgrade(plan.id as "starter" | "pro")}
                  disabled={!!checkoutLoading}
                >
                  {checkoutLoading?.startsWith(plan.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `${isIt ? "Passa a" : "Upgrade to"} ${plan.name}`
                  )}
                </Button>
              ) : isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  {isIt ? "Piano attuale" : "Current plan"}
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  {plan.id === "free" ? (isIt ? "Incluso" : "Included") : `${isIt ? "Passa a" : "Upgrade to"} ${plan.name}`}
                </Button>
              )}

              {/* Branding Footer */}
              <div className="pt-3 border-t border-border text-center">
                <a href="https://chatbot.your-genius.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors">
                  {plan.brandingFooter}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coupon */}
      <div className="glass rounded-xl p-4">
        <label className="text-sm text-muted-foreground block mb-2">
          {isIt ? "Hai già un codice sconto?" : "Have a discount code?"}
        </label>
        <div className="flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder={isIt ? "Inserisci il codice..." : "Enter code..."}
            className="bg-secondary border-border text-base"
          />
          <Button variant="outline" disabled={!couponCode.trim()}>
            {isIt ? "Applica" : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientUpgrade;
