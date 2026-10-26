import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, tx } from "@/hooks/useLanguage";
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
      toast({ title: tx("Payment cancelled, no charge made.", "Pagamento annullato, nessun addebito.") });
    }
    const next = new URLSearchParams(searchParams);
    next.delete("setup");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusMessages: Record<string, string> = {
    paid: tx("Payment received. We'll contact you shortly at the number provided.", "Pagamento ricevuto. Ti contatteremo a breve al numero indicato."),
    contacted: tx("We've contacted you: check your email/phone.", "Ti abbiamo contattato: controlla la tua email/telefono."),
    in_progress: tx("Your setup is in progress.", "Il tuo setup è in lavorazione."),
    completed: tx("Setup completed. Thank you!", "Setup completato. Grazie!"),
  };

  const submit = async () => {
    const p = phone.trim();
    if (p.length < 6) {
      setPhoneError(tx("Enter a valid phone number (at least 6 characters).", "Inserisci un numero di telefono valido (minimo 6 caratteri)."));
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
      toast({ title: tx("Unable to start payment", "Impossibile avviare il pagamento"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const items = [
    tx("Contact and analysis of your needs", "Contatto e analisi delle tue esigenze"),
    tx("Widget installation on your website", "Installazione del widget sul tuo sito"),
    tx("Prompt, FAQ and knowledge base setup", "Configurazione di prompt, FAQ e knowledge base"),
    tx("Testing together with you", "Test insieme a te"),
    tx("Tips on tone of voice and usage", "Consigli su tone of voice e utilizzo"),
  ];

  return (
    <div id="setup" className="glass scroll-mt-6 rounded-2xl p-6 border border-dashed border-primary/40">
      {justPaid && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          {tx("Thank you! Payment received, we'll contact you shortly.", "Grazie! Pagamento ricevuto, ti contatteremo a breve.")}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Wrench className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{tx("Professional setup", "Setup professionale")}</h2>
            <Badge variant="outline">{tx("Optional", "Facoltativo")}</Badge>
          </div>
          <p className="text-lg font-semibold text-primary">{tx("€570 one-off · VAT included", "€570 una tantum · IVA inclusa")}</p>
          <p className="text-sm text-muted-foreground">
            {tx("Want to be sure you start with an optimized, professional setup? We contact you, install the chatbot, configure it and test it together with you. We also give you tips on tone of voice and how to get the most out of it. If you prefer, you can set it up yourself.", "Vuoi essere sicuro di partire con una configurazione ottimizzata e professionale? Ti contattiamo, installiamo il chatbot, lo configuriamo e lo testiamo insieme a te. Ti diamo anche consigli su tone of voice e su come farlo rendere al meglio. Se preferisci, puoi configurarlo da solo in autonomia.")}
          </p>
          <ul className="space-y-1.5 text-sm">
            {items.map((f) => (
              <li key={f} className="flex items-start gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{tx("Available with any plan, including Free.", "Disponibile con qualsiasi piano, anche Free.")}</p>
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
                <label className="text-sm text-muted-foreground block mb-1">{tx("Phone *", "Telefono *")}</label>
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
                <label className="text-sm text-muted-foreground block mb-1">{tx("Notes (optional)", "Note (facoltative)")}</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  rows={4}
                  placeholder={tx("Website, preferred contact hours, special requests", "Sito web, orari in cui preferisci essere contattato, richieste particolari")}
                  className="bg-secondary border-border text-base"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{notes.length}/1000</p>
              </div>
              <Button className="w-full gradient-primary text-white border-0" onClick={submit} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (tx("Request setup", "Richiedi il setup"))}
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
        tx("50 conversations/month", "50 conversazioni/mese"),
        tx("10 leads/month", "10 lead/mese"),
        tx("System prompt (tone & bot role)", "Prompt di sistema (tono e ruolo del bot)"),
        tx("5 manual FAQs", "5 FAQ manuali"),
        tx("Lead capture in chat (name + email or phone)", "Raccolta contatti in chat (nome + email o telefono)"),
        tx("Multilingual replies", "Risposte multilingua"),
        tx("Email support", "Supporto email"),
      ],
      lockedFeatures: [
        tx("PDF/Word upload", "Upload PDF/Word"),
        tx("Advanced Search RAG", "Ricerca Avanzata RAG"),
        tx("Ecommerce & catalog integrations", "Integrazioni ecommerce e catalogo"),
        tx("Hotel Concierge module", "Modulo Concierge Hotel"),
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
        tx("500 conversations/month", "500 conversazioni/mese"),
        tx("Unlimited leads", "Lead illimitati"),
        tx("Advanced system prompt", "Prompt di sistema avanzato"),
        tx("Unlimited FAQs", "FAQ illimitate"),
        tx("PDF/Word upload", "Upload PDF/Word"),
        tx("Website pages and sitemap import", "Importazione pagine del sito e sitemap"),
        tx("Priority support", "Supporto prioritario"),
        tx("🔍 Advanced Search (RAG)", "🔍 Ricerca Avanzata (RAG)"),
        tx("🛒 XML/CSV Feed (daily sync)", "🛒 Feed XML/CSV (sync giornaliero)"),
        tx("Up to 500 catalog products", "Fino a 500 prodotti a catalogo"),
      ],
      lockedFeatures: [
        tx("Advanced analytics", "Analytics avanzati"),
        tx("Full ecommerce & catalog with real-time webhooks", "Ecommerce e catalogo completo con webhook real-time"),
        tx("Hotel Concierge module", "Modulo Concierge Hotel"),
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
        tx("1 custom chatbot for your business type", "1 chatbot personalizzato per il tuo settore"),
        tx("Unlimited conversations", "Conversazioni illimitate"),
        tx("Unlimited leads", "Lead illimitati"),
        tx("All Starter features", "Tutte le funzionalità Starter"),
        tx("Calendly integration for appointments", "Integrazione Calendly per gli appuntamenti"),
        tx("🔍 Advanced Search (RAG) — highlighted", "🔍 Ricerca Avanzata (RAG) — in evidenza"),
        tx("🛒 Full ecommerce & catalog (WooCommerce, Shopify, PrestaShop, API + real-time webhooks)", "🛒 Ecommerce e catalogo completo (WooCommerce, Shopify, PrestaShop, API + webhook real-time)"),
        tx("Up to 100,000 catalog products", "Fino a 100.000 prodotti a catalogo"),
        tx("🏨 Hotel Concierge: stay quotes, room QR codes, real-time guest requests, Results page", "🏨 Concierge Hotel: preventivi soggiorno, QR per le camere, richieste ospiti in tempo reale, pagina Risultati"),
        tx("📱 Instagram DM channel", "📱 Canale Instagram DM"),
        tx("⏱️ Auto-close inactive chats with recap email", "⏱️ Chiusura automatica chat inattive con email di riepilogo"),
        tx("Advanced analytics", "Analytics avanzati"),
        tx("Dedicated support", "Supporto dedicato"),
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
          {tx("Choose your plan", "Scegli il tuo piano")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {tx("Start free, upgrade when you're ready.", "Inizia gratis, passa a un piano superiore quando sei pronto.")}
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>
          {tx("Monthly", "Mensile")}
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative w-14 h-7 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-muted"}`}
        >
          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${yearly ? "translate-x-7" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
          {tx("Yearly", "Annuale")}
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
                  {tx("Current plan", "Piano attuale")}
                </div>
              )}
              {plan.popular && !isCurrent && (
                <div className="absolute -top-3 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  {tx("Most Popular", "Più Popolare")}
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
                    /{yearly ? (tx("year", "anno")) : (tx("month", "mese"))}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{tx("Prices include VAT", "Prezzi IVA inclusa")}</p>
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
                    🔍 {tx("Advanced Search (RAG)", "Ricerca Avanzata (RAG)")}
                  </span>
                  <p style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>{tx("Train your chatbot on your documents and PDFs", "Addestra il chatbot sui tuoi documenti e PDF")}</p>
                </div>
                {plan.rag === "locked" ? (
                  <div className="flex items-center gap-2 text-muted-foreground/50 text-sm">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>{tx("Locked – upgrade to unlock", "Bloccato – fai upgrade")}</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 text-sm ${plan.rag === "highlighted" ? "text-primary font-medium" : "text-primary"}`}>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{plan.rag === "highlighted" ? (tx("Included + Priority", "Incluso + Priorità")) : (tx("Included", "Incluso"))}</span>
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
                    `${tx("Upgrade to", "Passa a")} ${plan.name}`
                  )}
                </Button>
              ) : isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  {tx("Current plan", "Piano attuale")}
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  {plan.id === "free" ? (tx("Included", "Incluso")) : `${tx("Upgrade to", "Passa a")} ${plan.name}`}
                </Button>
              )}
              {plan.id !== "free" && (
                <p className="text-xs text-muted-foreground text-center -mt-2">
                  {tx("Have a discount code? You'll be able to enter it on the next step.", "Hai un codice sconto? Potrai inserirlo al passaggio successivo.")}
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
