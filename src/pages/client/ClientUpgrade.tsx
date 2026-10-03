import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Check, CheckCircle2, Loader2, Lock, Wrench } from "lucide-react";

// RAGInfoTooltip removed — replaced with inline description

const SetupServiceCard = ({ isIt }: { isIt: boolean }) => {
  const { clientId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("setup_requests")
      .select("status")
      .eq("client_id", clientId)
      .not("status", "in", "(pending_payment,cancelled)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setStatus(data?.status ?? null);
  }, [clientId]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (window.location.hash !== "#setup") return;
    document.getElementById("setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const s = searchParams.get("setup");
    if (!s) return;
    if (s === "success") {
      setJustPaid(true);
      loadStatus();
      const t = setTimeout(loadStatus, 4000);
      setTimeout(() => clearTimeout(t), 5000);
    } else if (s === "cancel") {
      toast({ title: isIt ? "Pagamento annullato, nessun addebito." : "Payment cancelled, no charge made." });
    }
    const next = new URLSearchParams(searchParams);
    next.delete("setup");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusMessages: Record<string, string> = {
    paid: isIt ? "Pagamento ricevuto. Ti contatteremo a breve al numero indicato." : "Payment received. We'll contact you shortly at the number provided.",
    contacted: isIt ? "Ti abbiamo contattato: controlla la tua email/telefono." : "We've contacted you: check your email/phone.",
    in_progress: isIt ? "Il tuo setup è in lavorazione." : "Your setup is in progress.",
    completed: isIt ? "Setup completato. Grazie!" : "Setup completed. Thank you!",
  };

  const submit = async () => {
    const p = phone.trim();
    if (p.length < 6) {
      setPhoneError(isIt ? "Inserisci un numero di telefono valido (minimo 6 caratteri)." : "Enter a valid phone number (at least 6 characters).");
      return;
    }
    setPhoneError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-setup-checkout", {
        body: { phone: p, notes: notes.trim() },
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const j = await error.context.json(); msg = j.error || msg; } catch { /* ignore */ }
        }
        throw new Error(msg);
      }
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: isIt ? "Impossibile avviare il pagamento" : "Unable to start payment", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const items = isIt
    ? ["Contatto e analisi delle tue esigenze", "Installazione del widget sul tuo sito", "Configurazione di prompt, FAQ e knowledge base", "Test insieme a te", "Consigli su tone of voice e utilizzo"]
    : ["Contact and analysis of your needs", "Widget installation on your website", "Prompt, FAQ and knowledge base setup", "Testing together with you", "Tips on tone of voice and usage"];

  return (
    <div id="setup" className="glass scroll-mt-6 rounded-2xl p-6 border border-dashed border-primary/40">
      {justPaid && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          {isIt ? "Grazie! Pagamento ricevuto, ti contatteremo a breve." : "Thank you! Payment received, we'll contact you shortly."}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Wrench className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{isIt ? "Setup professionale" : "Professional setup"}</h2>
            <Badge variant="outline">{isIt ? "Facoltativo" : "Optional"}</Badge>
          </div>
          <p className="text-lg font-semibold text-primary">{isIt ? "€570 una tantum · IVA inclusa" : "€570 one-off · VAT included"}</p>
          <p className="text-sm text-muted-foreground">
            {isIt
              ? "Vuoi essere sicuro di partire con una configurazione ottimizzata e professionale? Ti contattiamo, installiamo il chatbot, lo configuriamo e lo testiamo insieme a te. Ti diamo anche consigli su tone of voice e su come farlo rendere al meglio. Se preferisci, puoi configurarlo da solo in autonomia."
              : "Want to be sure you start with an optimized, professional setup? We contact you, install the chatbot, configure it and test it together with you. We also give you tips on tone of voice and how to get the most out of it. If you prefer, you can set it up yourself."}
          </p>
          <ul className="space-y-1.5 text-sm">
            {items.map((f) => (
              <li key={f} className="flex items-start gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{isIt ? "Disponibile con qualsiasi piano, anche Free." : "Available with any plan, including Free."}</p>
        </div>

        <div className="space-y-3">
          {status && statusMessages[status] ? (
            <div className="h-full flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              {statusMessages[status]}
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">{isIt ? "Telefono *" : "Phone *"}</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(null); }}
                  maxLength={40}
                  placeholder="+39 ..."
                  className="bg-secondary border-border text-base"
                  aria-invalid={!!phoneError}
                />
                {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">{isIt ? "Note (facoltative)" : "Notes (optional)"}</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  rows={4}
                  placeholder={isIt ? "Sito web, orari in cui preferisci essere contattato, richieste particolari" : "Website, preferred contact hours, special requests"}
                  className="bg-secondary border-border text-base"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{notes.length}/1000</p>
              </div>
              <Button className="w-full gradient-primary text-white border-0" onClick={submit} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isIt ? "Richiedi il setup" : "Request setup")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ClientUpgrade = () => {
  const { clientId } = useAuth();
  const { lang } = useLanguage();
  const { plan: clientPlan } = usePlan();
  const [yearly, setYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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
        isIt ? "Integrazioni ecommerce e catalogo" : "Ecommerce & catalog integrations",
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
        isIt ? "Integrazione Calendly per gli appuntamenti" : "Calendly integration for appointments",
        isIt ? "Supporto prioritario" : "Priority support",
        isIt ? "🔍 Ricerca Avanzata (RAG)" : "🔍 Advanced Search (RAG)",
        isIt ? "🛒 Feed XML/CSV (sync giornaliero)" : "🛒 XML/CSV Feed (daily sync)",
        isIt ? "Fino a 100 prodotti a catalogo" : "Up to 100 catalog products",
      ],
      lockedFeatures: [
        isIt ? "Analytics avanzati" : "Advanced analytics",
        isIt ? "Ecommerce e catalogo completo con webhook real-time" : "Full ecommerce & catalog with real-time webhooks",
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
        isIt ? "🛒 Ecommerce e catalogo completo (WooCommerce, Shopify, PrestaShop, API + webhook real-time)" : "🛒 Full ecommerce & catalog (WooCommerce, Shopify, PrestaShop, API + real-time webhooks)",
        isIt ? "Prodotti a catalogo illimitati" : "Unlimited catalog products",
        isIt ? "🏨 Concierge Hotel: preventivi soggiorno, QR per le camere, richieste ospiti in tempo reale, pagina Risultati" : "🏨 Hotel Concierge: stay quotes, room QR codes, real-time guest requests, Results page",
        isIt ? "📱 Canale Instagram DM" : "📱 Instagram DM channel",
        isIt ? "⏱️ Chiusura automatica chat inattive con email di riepilogo" : "⏱️ Auto-close inactive chats with recap email",
        isIt ? "Analytics avanzati" : "Advanced analytics",
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
                  <p className="mt-1 text-xs text-muted-foreground">{isIt ? "Prezzi IVA inclusa" : "Prices include VAT"}</p>
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
              {plan.id !== "free" && (
                <p className="text-xs text-muted-foreground text-center -mt-2">
                  {isIt ? "Hai un codice sconto? Potrai inserirlo al passaggio successivo." : "Have a discount code? You'll be able to enter it on the next step."}
                </p>
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

      <SetupServiceCard isIt={isIt} />
    </div>
  );
};

export default ClientUpgrade;
