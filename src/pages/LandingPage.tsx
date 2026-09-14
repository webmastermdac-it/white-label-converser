import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Play, Star, Menu, X, Check, Loader2, ArrowRight, Users, GraduationCap, BookOpen, Bot, ClipboardList, CalendarCheck, Palette, Globe, BarChart3, ShoppingCart, Lock } from "lucide-react";
import geniusLogo from "@/assets/genius.png";
import genieHero from "@/assets/genie-mascot-new.png";
import { supabase } from "@/integrations/supabase/client";
import logoSpedali from "@/assets/logos/spedali-civili.png";
import logoUnimi from "@/assets/logos/unimi.png";
import logoDtm from "@/assets/logos/dtm.png";
import logoSaniplast from "@/assets/logos/saniplast.png";
import logoZerotrenta from "@/assets/logos/zerotrenta.png";
import logoCurtense from "@/assets/logos/curtense.png";
import logoMetelli from "@/assets/logos/metelli-frutta.png";
import logoFiorita from "@/assets/logos/la-fiorita.png";
import logoMiri from "@/assets/logos/miri.png";
import logoGatti from "@/assets/logos/gatti.png";
import logoProvaglio from "@/assets/logos/provaglio.png";
import logoRodengo from "@/assets/logos/rodengo-saiano.png";
import logoMonticelli from "@/assets/logos/monticelli-brusati.png";
import logoOspitaletto from "@/assets/logos/ospitaletto.png";
import screenshotDashboard from "@/assets/screenshots/analytics-kpi.png";
import screenshotWidget from "@/assets/screenshots/chatbot-widget-new.png";
import screenshotSettings from "@/assets/screenshots/bot-settings-new.png";
import screenshotChatHistory from "@/assets/screenshots/chat-history.png";
import screenshotCharts from "@/assets/screenshots/analytics-charts.png";
import screenshotEcommerce from "@/assets/screenshots/ecommerce.png";
import CookieBanner from "@/components/CookieBanner";

/* ─── Scroll fade-in observer ─── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("opacity-100", "translate-y-0"); el.classList.remove("opacity-0", "translate-y-8"); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useFadeIn();
  return (
    <section id={id} ref={ref} className={`opacity-0 translate-y-8 transition-all duration-700 ease-out ${className}`}>
      {children}
    </section>
  );
}

/* ─── Staggered feature cards ─── */
const featureItems = [
  { Icon: Bot, color: "38 90% 55%", en: "AI Conversations", it: "Conversazioni AI", descEn: "Trained on your business. Answers questions, handles objections, qualifies leads 24/7.", descIt: "Addestrato sul tuo business. Risponde alle domande, gestisce le obiezioni e qualifica i lead 24/7." },
  { Icon: ClipboardList, color: "199 89% 48%", en: "Lead Capture", it: "Cattura Lead", descEn: "Never lose a visitor. When the bot can't answer, it captures their contact instantly.", descIt: "Non perdere mai un visitatore. Quando il bot non può rispondere, cattura il contatto istantaneamente." },
  { Icon: CalendarCheck, color: "142 71% 45%", en: "Booking", it: "Prenotazioni", descEn: "Integrated Calendly. Visitors book appointments directly in the chat.", descIt: "Calendly integrato. I visitatori prenotano appuntamenti direttamente nella chat." },
  { Icon: Palette, color: "340 82% 52%", en: "Full Customization", it: "Personalizzazione Totale", descEn: "Colors, avatar, tone of voice. Your chatbot, your brand. Complete white-label.", descIt: "Colori, avatar, tono di voce. Il tuo chatbot, il tuo brand. Completa white-label." },
  { Icon: Globe, color: "199 89% 48%", en: "Multilingual", it: "Multilingua", descEn: "Speaks English and Italian. Auto-detects visitor language.", descIt: "Parla italiano e inglese. Rileva automaticamente la lingua del visitatore." },
  { Icon: BarChart3, color: "262 83% 58%", en: "Full Dashboard", it: "Dashboard Completa", descEn: "Track leads, conversations, and conversions in real time with advanced analytics.", descIt: "Monitora lead, conversazioni e conversioni in tempo reale con analytics avanzati." },
  { Icon: ShoppingCart, color: "38 90% 55%", en: "Ecommerce Integration", it: "Integrazione Ecommerce", descEn: "Connect WooCommerce, Shopify or PrestaShop. The bot knows products, prices, availability and variants in real time. Automatic sync every 24 hours.", descIt: "Connetti WooCommerce, Shopify o PrestaShop. Il bot conosce prodotti, prezzi, disponibilità e varianti in tempo reale. Sincronizzazione automatica ogni 24 ore." },
];

function FeatureGrid({ t }: { t: (en: string, it: string) => string }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {featureItems.map((f, i) => (
        <div
          key={i}
          className={`group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all duration-500 hover:border-opacity-40 overflow-hidden ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{
            ["--card-accent" as string]: f.color,
            transitionDelay: visible ? `${i * 100}ms` : "0ms",
            transitionProperty: "opacity, transform, border-color",
            transitionDuration: "600ms",
            transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {/* Glow overlay on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(ellipse at 30% 20%, hsl(${f.color} / 0.12) 0%, transparent 70%)` }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none border border-transparent rounded-2xl" style={{ borderColor: `hsl(${f.color} / 0.3)` }} />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `hsl(${f.color} / 0.15)` }}>
              <f.Icon className="w-6 h-6" style={{ color: `hsl(${f.color})` }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>{t(f.en, f.it)}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{t(f.descEn, f.descIt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// RAGTooltip removed — replaced with inline description

function PricingGrid({ yearly, t }: { yearly: boolean; t: (en: string, it: string) => string }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cardClass = (i: number, extra = "") =>
    `${extra} transition-all ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`;

  const cardStyle = (i: number) => ({
    transitionDelay: visible ? `${i * 150}ms` : "0ms",
    transitionProperty: "opacity, transform",
    transitionDuration: "600ms",
    transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  });

  return (
    <div ref={gridRef} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {/* Free */}
      <div className={cardClass(0, "bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-6 flex flex-col")} style={cardStyle(0)}>
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Free</h3>
          <p className="text-white/40 text-sm mt-1">{t("Try Genius with no commitment", "Per provare Genius senza impegno")}</p>
          <div className="mt-3">
            <span className="text-4xl font-extrabold">€0</span>
            <span className="text-white/40 text-sm">/{t("month", "mese")}</span>
          </div>
        </div>
        <Link to="/register" className="block">
          <Button variant="outline" className="w-full border-white/20 text-[#1a1a1a] bg-white hover:bg-white/90 rounded-full h-11 font-semibold">
            {t("Start Free", "Inizia Gratis")}
          </Button>
        </Link>
        <ul className="space-y-3 text-sm text-white/70">
          {[
            t("1 custom chatbot for your business type", "1 chatbot personalizzato per il tuo settore"),
            t("50 conversations/month", "50 conversazioni/mese"),
            t("10 leads/month", "10 lead/mese"),
            t("System prompt (tone & bot role)", "Prompt di sistema (tono e ruolo del bot)"),
            t("Free text for basic instructions", "Testo libero per istruzioni base"),
            t("5 manual FAQs", "5 FAQ manuali"),
            t("Email support", "Supporto email"),
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />{item}</li>
          ))}
          {[
            t("🔒 PDF/Word upload", "🔒 Upload PDF/Word"),
            t("🔒 Advanced Search RAG", "🔒 Ricerca Avanzata RAG"),
            t("🔒 Ecommerce integrations", "🔒 Integrazioni ecommerce"),
          ].map((item, i) => (
            <li key={`lock-${i}`} className="flex items-start gap-2 text-white/30"><Lock className="w-4 h-4 shrink-0 mt-0.5" />{item}</li>
          ))}
        </ul>
        {/* RAG Section */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="mb-2">
            <span className="text-xs font-semibold text-white/30 uppercase tracking-wider">🔍 {t("Advanced Search (RAG)", "Ricerca Avanzata (RAG)")}</span>
            <p style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>{t("Train your chatbot on your documents and PDFs", "Addestra il chatbot sui tuoi documenti e PDF")}</p>
          </div>
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{t("Locked – upgrade to unlock", "Bloccato – fai upgrade per sbloccare")}</span>
          </div>
        </div>
        {/* Branding Footer */}
        <div className="pt-3 border-t border-white/10 text-center">
          <a href="https://chatbot.your-genius.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/50 transition-colors">
            Free Chatbot Genius
          </a>
        </div>
      </div>

      {/* Starter */}
      <div className={cardClass(1, "bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-6 flex flex-col")} style={cardStyle(1)}>
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Starter</h3>
          <p className="text-white/40 text-sm mt-1">{t("For small businesses and professionals", "Per piccole imprese e professionisti")}</p>
          <div className="mt-3">
            <span className="text-4xl font-extrabold">€{yearly ? "490" : "49"}</span>
            <span className="text-white/40 text-sm">/{yearly ? t("year", "anno") : t("month", "mese")}</span>
          </div>
        </div>
        <Link to="/register" className="block">
          <Button variant="outline" className="w-full border-white/20 text-[#1a1a1a] bg-white hover:bg-white/90 rounded-full h-11 font-semibold">
            {t("Try Free, Then Upgrade", "Prova Gratis, poi Upgrade")}
          </Button>
        </Link>
        <ul className="space-y-3 text-sm text-white/70">
          {[
            t("1 custom chatbot for your business type", "1 chatbot personalizzato per il tuo settore"),
            t("500 conversations/month", "500 conversazioni/mese"),
            t("Unlimited leads", "Lead illimitati"),
            t("Advanced system prompt", "Prompt di sistema avanzato"),
            t("Unlimited FAQs", "FAQ illimitate"),
            t("PDF/Word upload", "Upload PDF/Word"),
            t("Industry templates", "Template di settore"),
            t("Priority support", "Supporto prioritario"),
            t("🔍 Advanced Search (RAG)", "🔍 Ricerca Avanzata (RAG)"),
            t("🛒 XML/CSV Feed (daily sync)", "🛒 Feed XML/CSV (sync giornaliero)"),
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />{item}</li>
          ))}
          {[
            t("🔒 Advanced analytics", "🔒 Analytics avanzati"),
          ].map((item, i) => (
            <li key={`lock-${i}`} className="flex items-start gap-2 text-white/30"><Lock className="w-4 h-4 shrink-0 mt-0.5" />{item}</li>
          ))}
        </ul>
        {/* RAG Section */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="mb-2">
            <span className="text-xs font-semibold text-[#F5A623]/70 uppercase tracking-wider">🔍 {t("Advanced Search (RAG)", "Ricerca Avanzata (RAG)")}</span>
            <p style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>{t("Train your chatbot on your documents and PDFs", "Addestra il chatbot sui tuoi documenti e PDF")}</p>
          </div>
          <div className="flex items-center gap-2 text-[#F5A623] text-sm">
            <Check className="w-4 h-4 shrink-0" />
            <span>{t("Included", "Incluso")}</span>
          </div>
        </div>
        {/* Branding Footer */}
        <div className="pt-3 border-t border-white/10 text-center">
          <a href="https://chatbot.your-genius.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/50 transition-colors">
            Chatbot Genius
          </a>
        </div>
      </div>

      {/* Pro */}
      <div className={cardClass(2, "relative bg-gradient-to-br from-[#F5A623]/10 to-transparent border-2 border-[#F5A623]/40 rounded-2xl p-8 space-y-6 shadow-lg shadow-[#F5A623]/10 flex flex-col")} style={cardStyle(2)}>
        <div className="absolute -top-3 right-6 bg-[#F5A623] text-black text-xs font-bold px-3 py-1 rounded-full">{t("Most Popular", "Più Popolare")}</div>
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Pro</h3>
          <p className="text-white/40 text-sm mt-1">{t("For agencies and growing businesses", "Per agenzie e aziende in crescita")}</p>
          <div className="mt-3">
            <span className="text-4xl font-extrabold">€{yearly ? "1490" : "149"}</span>
            <span className="text-white/40 text-sm">/{yearly ? t("year", "anno") : t("month", "mese")}</span>
          </div>
        </div>
        <Link to="/register" className="block">
          <Button className="w-full bg-[#F5A623] hover:bg-[#E09800] text-black rounded-full h-11 font-semibold">
            {t("Try Free, Then Upgrade", "Prova Gratis, poi Upgrade")}
          </Button>
        </Link>
        <ul className="space-y-3 text-sm text-white/70">
          {[
            t("1 custom chatbot for your business type", "1 chatbot personalizzato per il tuo settore"),
            t("Unlimited conversations", "Conversazioni illimitate"),
            t("Unlimited leads", "Lead illimitati"),
            t("All Starter features", "Tutte le funzionalità Starter"),
            t("🔍 Advanced Search (RAG) — highlighted", "🔍 Ricerca Avanzata (RAG) — in evidenza"),
            t("Advanced analytics", "Analytics avanzati"),
            t("Dedicated support", "Supporto dedicato"),
            t("🛒 Full ecommerce (WooCommerce, Shopify, PrestaShop, API + real-time webhooks)", "🛒 Ecommerce completo (WooCommerce, Shopify, PrestaShop, API + webhook real-time)"),
            t("Complete white label", "White label completo"),
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />{item}</li>
          ))}
        </ul>
        {/* RAG Section */}
        <div className="mt-auto pt-4 border-t border-[#F5A623]/30">
          <div className="mb-2">
            <span className="text-xs font-semibold text-[#F5A623] uppercase tracking-wider">🔍 {t("Advanced Search (RAG)", "Ricerca Avanzata (RAG)")}</span>
            <p style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>{t("Train your chatbot on your documents and PDFs", "Addestra il chatbot sui tuoi documenti e PDF")}</p>
          </div>
          <div className="flex items-center gap-2 text-[#F5A623] text-sm font-medium">
            <Check className="w-4 h-4 shrink-0" />
            <span>{t("Included + Priority", "Incluso + Priorità")}</span>
          </div>
        </div>
        {/* Branding Footer */}
        <div className="pt-3 border-t border-[#F5A623]/20 text-center">
          <a href="https://chatbot.your-genius.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-[#F5A623]/50 hover:text-[#F5A623]/70 transition-colors">
            Chatbot Genius
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { lang, setLang, t } = useLanguage();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const handleCheckout = async (plan: "starter" | "pro") => {
    const interval = yearly ? "year" : "month";
    setCheckoutLoading(`${plan}-${interval}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (!email) {
        window.location.href = "/login";
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan, interval, email },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenu(false);
  };

  const navLinks = [
    { label: t("Features", "Funzionalità"), id: "features" },
    { label: t("How It Works", "Come Funziona"), id: "how-it-works" },
    { label: t("About Us", "Chi Siamo"), id: "about" },
    { label: t("Pricing", "Prezzi"), id: "pricing" },
    { label: t("References", "Referenze"), id: "references" },
  ];

  const screenshotTabs = [
    { key: "dashboard", label: "Dashboard", img: screenshotDashboard, desc: t("Monitor all conversations, leads, and performance in real time.", "Monitora tutte le conversazioni, i lead e le performance in tempo reale.") },
    { key: "widget", label: "Chatbot Widget", img: screenshotWidget, desc: t("The widget integrates seamlessly on any website with full customization.", "Il widget si integra perfettamente su qualsiasi sito con personalizzazione completa.") },
    { key: "config", label: t("Configuration", "Configurazione"), img: screenshotSettings, desc: t("Configure identity, colors, behavior and knowledge base in minutes.", "Configura identità, colori, comportamento e knowledge base in pochi minuti.") },
    { key: "chat-history", label: t("Chat History", "Storico Chat"), img: screenshotChatHistory, desc: t("View all conversations with details on messages, duration and dates.", "Visualizza tutte le conversazioni con dettagli su messaggi, durata e date.") },
    { key: "analytics", label: "Analytics", img: screenshotCharts, desc: t("Advanced charts: lead distribution, status, source pages and trends.", "Grafici avanzati: distribuzione lead, stato, pagine sorgente e trend.") },
    { key: "ecommerce", label: "Ecommerce", img: screenshotEcommerce, desc: t("Connect your store: WooCommerce, Shopify, PrestaShop or custom feeds.", "Connetti il tuo store: WooCommerce, Shopify, PrestaShop o feed personalizzati.") },
  ];

  return (
    <div className="min-h-screen bg-[#0F1419] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ─── NAVBAR ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0F1419]/90 backdrop-blur-lg shadow-lg shadow-black/30" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src={geniusLogo} alt="Genius" className="h-9 w-9" />
            <span className="font-bold text-lg hidden sm:inline" style={{ fontFamily: "'Syne', sans-serif" }}>
              Genius <span className="text-[#F5A623]">Chatbot</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="text-sm text-white/60 hover:text-white transition-colors">{l.label}</button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "it" ? "en" : "it")}
              className="text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20 hover:border-[#F5A623] hover:text-[#F5A623] transition-colors"
            >
              {lang === "it" ? "EN" : "IT"}
            </button>
            <Link to="/login" className="hidden sm:block text-sm text-white/60 hover:text-white hover:underline underline-offset-4 transition-colors">
              {t("Login", "Accedi")}
            </Link>
            <Link to="/register" className="hidden sm:block">
              <Button className="bg-transparent border border-[#F5A623] text-[#F5A623] hover:bg-[#F5A623] hover:text-black text-sm h-9 px-5 rounded-full transition-all">
                {t("Try Free", "Prova Gratis")}
              </Button>
            </Link>
            <button className="lg:hidden text-white" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="lg:hidden bg-[#0F1419]/95 backdrop-blur-lg border-t border-white/10 px-6 pb-6 pt-4 space-y-4">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block text-sm text-white/60 hover:text-white">{l.label}</button>
            ))}
            <Link to="/register" onClick={() => setMobileMenu(false)}>
              <Button className="w-full bg-[#F5A623] hover:bg-[#E09800] text-black rounded-full mt-2 font-semibold">
                {t("Try Free", "Prova Gratis")}
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <header className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1419] via-[#1A1F2E] to-[#0F1419]" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F5A623]/8 rounded-full blur-[120px]" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-[#F5A623]/20 rounded-full" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              animation: `floatParticle ${4 + Math.random() * 6}s ease-in-out infinite ${Math.random() * 3}s`
            }} />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/70">
              <span className="w-2 h-2 bg-[#F5A623] rounded-full animate-pulse" />
              Powered by AI • {t("Active 24/7", "Attivo 24/7")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
              {lang === "en" ? <>The AI Chatbot That <span className="text-[#F5A623]">Captures Leads</span> While You Sleep</> : <>Il Chatbot AI che <span className="text-[#F5A623]">Cattura Lead</span> Mentre Dormi</>}
            </h1>
            <p className="text-white/50 text-lg sm:text-xl max-w-xl mx-auto md:mx-0 leading-relaxed">
              {t(
                "Deploy a smart chatbot on your website in 5 minutes. Answer questions 24/7, capture leads automatically, and book consultations — all on autopilot.",
                "Installa un chatbot intelligente sul tuo sito in 5 minuti. Rispondi alle domande 24/7, cattura lead automaticamente e prenota consulenze — tutto in autopilota."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/register">
                <Button className="bg-[#F5A623] hover:bg-[#E09800] text-black text-base h-12 px-8 rounded-full shadow-lg shadow-[#F5A623]/20 font-semibold gap-2">
                  {t("Start Free", "Inizia Gratis")} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" onClick={() => { scrollTo("how-it-works"); }} className="border-white/20 bg-white text-gray-900 hover:bg-white/90 h-12 px-8 rounded-full gap-2">
                <Play className="w-4 h-4" />
                {t("Watch Demo", "Guarda la Demo")}
              </Button>
            </div>

            {/* Social proof mini */}
            <div className="flex items-center gap-3 justify-center md:justify-start pt-2">
              <div className="flex -space-x-2">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" alt="" className="w-8 h-8 rounded-full border-2 border-[#0F1419]" />
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" alt="" className="w-8 h-8 rounded-full border-2 border-[#0F1419]" />
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" alt="" className="w-8 h-8 rounded-full border-2 border-[#0F1419]" />
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#F5A623] text-[#F5A623]" />)}
                </div>
                <p className="text-white/40 text-xs">{t("Trusted by", "Scelto da")} <span className="text-white/70 font-semibold">250+</span> {t("businesses", "aziende")}</p>
              </div>
            </div>
          </div>

          {/* Mascot */}
          <div className="flex-1 flex justify-center md:justify-end max-w-md w-full relative">
            {/* Particles */}
            {[...Array(20)].map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: `${3 + (i % 4) * 2.5}px`,
                  height: `${3 + (i % 4) * 2.5}px`,
                  background: `radial-gradient(circle, rgba(245,166,35,${0.7 + (i % 3) * 0.1}) 0%, transparent 70%)`,
                  boxShadow: `0 0 ${8 + (i % 5) * 3}px rgba(245,166,35,0.5)`,
                  top: `${5 + (i * 4.7) % 85}%`,
                  left: `${10 + (i * 4.3) % 80}%`,
                  animation: `sparkle${i % 3} ${2.5 + (i % 5) * 0.8}s ease-in-out ${i * 0.3}s infinite`,
                  opacity: 0,
                }}
              />
            ))}
            {/* Mystic aura */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: "320px",
                height: "320px",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "radial-gradient(circle, rgba(245,166,35,0.18) 0%, rgba(245,166,35,0.06) 50%, transparent 70%)",
                animation: "auraPulse 3.5s ease-in-out infinite",
                zIndex: 0,
              }}
            />
            <div
              style={{
                animation: "genieReveal 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards, floatMascot 4s ease-in-out 2.4s infinite",
                opacity: 0,
                position: "relative",
                zIndex: 1,
              }}
            >
              <img
                src={genieHero}
                alt="Genius Chatbot Genie"
                className="w-72 sm:w-96"
                style={{
                  filter: "drop-shadow(0 0 50px rgba(245,166,35,0.35)) drop-shadow(0 0 100px rgba(245,166,35,0.15))",
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ─── FEATURES ─── */}
      <Section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-[#F5A623] text-sm font-semibold text-center mb-3 tracking-wider uppercase">{t("Features", "Funzionalità")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("Everything You Need", "Tutto Ciò di Cui Hai Bisogno")}
          </h2>
          <p className="text-white/50 text-center mb-14 max-w-2xl mx-auto">
            {t("Powerful features to turn every website visitor into a qualified lead.", "Funzionalità potenti per trasformare ogni visitatore del sito in un lead qualificato.")}
          </p>
          <FeatureGrid t={t} />
        </div>
      </Section>

      {/* ─── HOW IT WORKS (Screenshots) ─── */}
      <Section id="how-it-works" className="py-20 md:py-28 bg-gradient-to-b from-transparent via-[#1A1F2E]/30 to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-[#F5A623] text-sm font-semibold text-center mb-3 tracking-wider uppercase">{t("How It Works", "Come Funziona")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("See Genius in Action", "Vedi Genius in Azione")}
          </h2>
          <p className="text-white/50 text-center mb-10 max-w-2xl mx-auto">
            {t("A complete platform to manage your AI chatbot, from configuration to analytics.", "Una piattaforma completa per gestire il tuo chatbot AI, dalla configurazione all'analisi.")}
          </p>

          {/* Tabs */}
          <div className="flex justify-start sm:justify-center gap-2 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {screenshotTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  activeTab === tab.key
                    ? "bg-[#F5A623] text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Screenshot display */}
          {screenshotTabs.map((tab) => (
            activeTab === tab.key && (
              <div key={tab.key} className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 bg-[#1A1F2E]">
                  {/* Browser bar */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-white/10 rounded-full px-4 py-1 text-xs text-white/40 max-w-xs mx-auto text-center">
                        app.geniuschatbot.it
                      </div>
                    </div>
                  </div>
                  <img src={tab.img} alt={tab.label} className={`w-full ${tab.key === "widget" ? "lg:w-1/2 lg:mx-auto" : ""}`} />
                </div>
                <p className="text-white/50 text-center text-sm">{tab.desc}</p>
              </div>
            )
          ))}
        </div>
      </Section>

      {/* ─── ABOUT / CHI SIAMO ─── */}
      <Section id="about" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-[#F5A623] text-sm font-semibold text-center mb-3 tracking-wider uppercase">{t("About Us", "Chi Siamo")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
            {lang === "en" ? <>A Product by <span className="text-[#F5A623]">MDAC Web Agency</span></> : <>Un Prodotto di <span className="text-[#F5A623]">MDAC Web Agency</span></>}
          </h2>
          <div className="max-w-3xl mx-auto space-y-4 text-white/60 text-center leading-relaxed">
            <p>
              {t(
                "Founded in 2004, we continue to grow alongside the businesses that choose to work with us. Our work consists of helping companies have a more complete vision of their online presence to reach excellence.",
                "Nati nel 2004, continuiamo a crescere insieme alle imprese che scelgono di lavorare con noi. Il nostro lavoro consiste nell'aiutare le aziende ad avere una visione più completa della propria dimensione e presenza online per arrivare all'eccellenza."
              )}
            </p>
            <p>
              {t(
                "With creativity, in-depth data analysis and results orientation, we generate quality traffic, acquire interested contacts, increase sales and retain satisfied customers.",
                "Con creatività, studio approfondito dei dati e orientamento al risultato, generiamo traffico di qualità, acquisiamo contatti interessati, aumentiamo le vendite e fidelizziamo i clienti soddisfatti dell'esperienza."
              )}
            </p>
            <p className="text-white/70 font-medium">
              <span className="text-[#F5A623] font-bold">Genius Chatbot</span>{" "}
              {t(
                "is our cutting-edge AI product, born from twenty years of digital marketing experience to offer an intelligent virtual assistant to every business.",
                "è il nostro prodotto AI all'avanguardia, nato dall'esperienza ventennale nel digital marketing per offrire un assistente virtuale intelligente ad ogni azienda."
              )}
            </p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-6 mt-14">
            {[
              { icon: <Users className="w-6 h-6 text-[#F5A623]" />, title: t("Zero Outsourcing", "Zero Outsourcing"), desc: t("We handle everything, start to finish. Our staff counts 8+ professionals with diverse skills.", "Ci occupiamo di tutto noi, dall'inizio alla fine. Il nostro staff conta +8 professionisti con competenze diverse.") },
              { icon: <Star className="w-6 h-6 text-[#F5A623]" />, title: t("250+ Satisfied Clients", "250+ Clienti Soddisfatti"), desc: t("Since 2004 we've helped over 250 companies achieve their business goals.", "Dal 2004 a oggi abbiamo aiutato più di 250 aziende a raggiungere i propri obiettivi di business.") },
              { icon: <BookOpen className="w-6 h-6 text-[#F5A623]" />, title: t("Continuous Learning", "Formazione Continua"), desc: t("Every day we study and apply new strategies to guarantee ever-improving results.", "Ogni giorno studiamo e applichiamo nuove strategie per garantire risultati sempre migliori.") },
            ].map((s, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center space-y-3">
                <div className="flex justify-center">{s.icon}</div>
                <h3 className="font-semibold" style={{ fontFamily: "'Syne', sans-serif" }}>{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── TESTIMONIALS ─── */}
      <Section className="py-20 md:py-28 bg-gradient-to-b from-transparent via-[#1A1F2E]/20 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-[#F5A623] text-sm font-semibold text-center mb-3 tracking-wider uppercase">{t("Testimonials", "Testimonianze")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-14" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("What Our Clients Say", "Cosa Dicono i Nostri Clienti")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Marco Bianchi", company: "Studio Legale Bianchi & Associati", initials: "MB",
                en: "In just one week, the chatbot captured more leads than our contact form did in a month. Absolutely game-changing.",
                it: "In una sola settimana, il chatbot ha catturato più lead del nostro modulo di contatto in un mese. Assolutamente rivoluzionario."
              },
              {
                name: "Giulia Rossetti", company: "Rossetti Digital Agency", initials: "GR",
                en: "Our clients love it. We embed a Genius chatbot on every website we build now. The ROI is immediate.",
                it: "I nostri clienti lo adorano. Ora integriamo un chatbot Genius su ogni sito che costruiamo. Il ROI è immediato."
              },
              {
                name: "Andrea Colombo", company: "Colombo Consulting S.r.l.", initials: "AC",
                en: "Setup took literally 5 minutes. The AI handles questions I didn't even think visitors would ask.",
                it: "La configurazione ha richiesto letteralmente 5 minuti. L'AI gestisce domande che non avrei mai immaginato i visitatori potessero fare."
              },
            ].map((review, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="text-3xl text-[#F5A623]/60">"</div>
                <p className="text-white/70 text-sm leading-relaxed">{t(review.en, review.it)}</p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-[#F5A623]/20 text-[#F5A623] flex items-center justify-center text-sm font-bold">{review.initials}</div>
                  <div>
                    <p className="font-semibold text-sm">{review.name}</p>
                    <p className="text-white/40 text-xs">{review.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── PRICING ─── */}
      {/* ─── VERTICALS ─── */}
      <Section id="verticals" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("Choose the chatbot for your business", "Scegli il chatbot per il tuo settore")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {[
              { Icon: CalendarCheck, color: "200 90% 55%", vertical: "booking", title: t("Bookings & Appointments", "Prenotazioni & Appuntamenti"), desc: t("For dentists, physiotherapists, beauty centers, nutritionists, psychologists, clinics and medical practices. Calendly integrated.", "Per dentisti, fisioterapisti, centri estetici, nutrizionisti, psicologi, poliambulatori, studi medici. Calendly integrato.") },
              { Icon: ShoppingCart, color: "35 91% 55%", vertical: "ecommerce", title: t("Ecommerce", "Ecommerce"), desc: t("For online stores: WooCommerce, Shopify, PrestaShop or API for niche platforms.", "Per negozi online: WooCommerce, Shopify, PrestaShop o API per piattaforme di nicchia.") },
              { Icon: BookOpen, color: "150 70% 45%", vertical: "hospitality", title: t("Restaurants & Hotels", "Ristorazione & Hotel"), desc: t("Reads menus, documents or your website and saves every request as a lead.", "Legge menu, documenti o il tuo sito e salva ogni richiesta come lead.") },
            ].map((c, i) => (
              <div
                key={i}
                className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all duration-500 hover:border-white/25 overflow-hidden flex flex-col"
                style={{ ["--card-accent" as string]: c.color }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `hsl(${c.color} / 0.15)` }}>
                  <c.Icon className="w-6 h-6" style={{ color: `hsl(${c.color})` }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>{c.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed mb-6">{c.desc}</p>
                <Link to={`/register?vertical=${c.vertical}`} className="mt-auto">
                  <Button className="w-full bg-[#F5A623] hover:bg-[#E09800] text-black rounded-full h-11 font-semibold">
                    {t("Choose this", "Scegli questo")}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="pricing" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-[#F5A623] text-sm font-semibold text-center mb-3 tracking-wider uppercase">{t("Pricing", "Prezzi")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("Simple, Transparent Pricing", "Prezzi Semplici e Trasparenti")}
          </h2>
          <p className="text-white/50 text-center mb-10 max-w-xl mx-auto">
            {t("Choose the plan that fits your business.", "Scegli il piano più adatto al tuo business.")}
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mb-14">
            <span className={`text-sm ${!yearly ? "text-white" : "text-white/40"}`}>{t("Monthly", "Mensile")}</span>
            <button onClick={() => setYearly(!yearly)} className={`relative w-14 h-7 rounded-full transition-colors ${yearly ? "bg-[#F5A623]" : "bg-white/20"}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${yearly ? "translate-x-7" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-sm ${yearly ? "text-white" : "text-white/40"}`}>{t("Yearly", "Annuale")}</span>
            {yearly && <span className="text-xs bg-[#F5A623]/20 text-[#F5A623] px-2 py-0.5 rounded-full font-medium">-20%</span>}
          </div>

          <PricingGrid yearly={yearly} t={t} />
        </div>
      </Section>

      {/* ─── REFERENCES / LOGOS ─── */}
      <Section id="references" className="py-20 md:py-28 bg-gradient-to-b from-transparent via-[#1A1F2E]/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-[#F5A623] text-sm font-semibold text-center mb-3 tracking-wider uppercase">{t("References", "Referenze")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("Our Clients", "I Nostri Clienti")}
          </h2>
          <p className="text-white/50 text-center mb-14 max-w-2xl mx-auto">
            {t(
              "Every day we work to grow SMEs and companies online. Over the years we've helped hundreds of entrepreneurs achieve their business goals.",
              "Ogni giorno lavoriamo per far crescere online PMI e aziende. Negli anni abbiamo aiutato centinaia di imprenditori e aziende a raggiungere i propri obiettivi di business."
            )}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { src: logoSpedali, alt: "Spedali Civili di Brescia" },
              { src: logoUnimi, alt: "Università degli Studi di Milano" },
              { src: logoDtm, alt: "DTM" },
              { src: logoMetelli, alt: "Metelli Frutta" },
              { src: logoFiorita, alt: "La Fiorita Franciacorta" },
              { src: logoCurtense, alt: "Curtense" },
              { src: logoZerotrenta, alt: "Zerotrenta" },
              { src: logoMiri, alt: "Maurizio Miri" },
              { src: logoGatti, alt: "Fratelli Gatti Tappezzeria" },
              { src: logoSaniplast, alt: "Saniplast" },
              { src: logoProvaglio, alt: "Comune di Provaglio d'Iseo" },
              { src: logoRodengo, alt: "Comune di Rodengo Saiano" },
              { src: logoMonticelli, alt: "Comune di Monticelli Brusati" },
              { src: logoOspitaletto, alt: "Comune di Ospitaletto" },
            ].map((logo) => (
              <div key={logo.alt} className="bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-center p-6 h-28 hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300">
                <img src={logo.src} alt={logo.alt} className="max-h-12 max-w-[140px] w-auto object-contain opacity-70 hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FINAL CTA ─── */}
      <Section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <p className="text-[#F5A623] text-sm font-semibold tracking-wider uppercase">{t("Setup in 5 minutes", "Configurazione in 5 minuti")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
            {lang === "en" ? <>Ready to Never Lose <span className="text-[#F5A623]">a Lead Again?</span></> : <>Pronto a Non Perdere <span className="text-[#F5A623]">Mai Più un Lead?</span></>}
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            {t("Start your free trial today — no credit card required.", "Inizia la prova gratuita oggi — nessuna carta di credito richiesta.")}
          </p>
          <Link to="/register">
            <Button className="bg-[#F5A623] hover:bg-[#E09800] text-black h-12 px-10 rounded-full text-base font-bold shadow-lg shadow-[#F5A623]/20 mt-2 gap-2">
              {t("Start Free Trial", "Inizia la Prova Gratuita")} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0A0E13] border-t border-white/5 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <img src={geniusLogo} alt="Genius" className="h-8 w-8" />
                <span className="font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Genius <span className="text-[#F5A623]">Chatbot</span></span>
              </div>
              <p className="text-white/40 text-sm">
                {t("The AI chatbot platform for modern businesses.", "La piattaforma di chatbot AI per le imprese moderne.")}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-center gap-2">
              <Link to="/privacy-policy" className="text-sm text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-white/50 hover:text-white transition-colors">{t("Terms of Service", "Termini di Servizio")}</Link>
              <a href="mailto:mdac@mdac.it" className="text-sm text-white/50 hover:text-white transition-colors">{t("Contact", "Contatti")}</a>
            </div>

            <div className="text-sm text-white/40 space-y-1 md:text-right">
              <p className="font-medium text-white/60">Genius Chatbot è un prodotto MDAC S.r.l.</p>
              <p>Via Padana Superiore, 173/A – 25035 Ospitaletto (BS)</p>
              <p>P.IVA 04333340984</p>
              <p>mdac@mdac.it | +39 030 68 40 636</p>
              <a href="https://www.mdac.agency" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">www.mdac.agency</a>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 text-center text-xs text-white/30">
            © 2026 Genius Chatbot Builder. {t("All rights reserved.", "Tutti i diritti riservati.")} {t("A product of", "Un prodotto")} MDAC S.r.l.
          </div>
        </div>
      </footer>

      {/* ─── VIDEO MODAL ─── */}
      {videoOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setVideoOpen(false)}>
          <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setVideoOpen(false)} className="absolute -top-10 right-0 text-white/60 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
              className="w-full h-full rounded-xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Demo video"
            />
          </div>
        </div>
      )}

      {/* ─── CSS Animations ─── */}
      <style>{`
        @keyframes genieReveal {
          0% { opacity: 0; transform: translateY(80px); }
          60% { opacity: 0.7; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatMascot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-30px) scale(1.5); opacity: 0.5; }
        }
        @keyframes sparkle0 {
          0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          30% { opacity: 0.9; transform: translate(-12px, -20px) scale(1.2); }
          70% { opacity: 0.5; transform: translate(8px, -35px) scale(0.8); }
        }
        @keyframes sparkle1 {
          0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.6); }
          40% { opacity: 1; transform: translate(15px, -25px) scale(1.3); }
          80% { opacity: 0.3; transform: translate(-10px, -40px) scale(0.7); }
        }
        @keyframes sparkle2 {
          0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          25% { opacity: 0.8; transform: translate(-8px, -30px) scale(1.1); }
          65% { opacity: 0.6; transform: translate(12px, -15px) scale(0.9); }
        }
        @keyframes auraPulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>

      <CookieBanner />
    </div>
  );
}
