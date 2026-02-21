import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Play, Star, Menu, X, Check, Loader2 } from "lucide-react";
import geniusLogo from "@/assets/genius.png";
import genieMascot from "@/assets/genie-dark.png";
import { supabase } from "@/integrations/supabase/client";
import logoSpedali from "@/assets/logos/spedali-civili.png";
import logoUnimi from "@/assets/logos/unimi.png";
import logoDtm from "@/assets/logos/dtm.png";
import logoSaniplast from "@/assets/logos/saniplast.png";
import logoZerotrenta from "@/assets/logos/zerotrenta.png";
import logoCurtense from "@/assets/logos/curtense.png";

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

/* ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { lang, setLang, t } = useLanguage();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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
    { label: t("Pricing", "Prezzi"), id: "pricing" },
    { label: "Demo", id: "demo" },
  ];

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ─── NAVBAR ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#1A1A2E]/80 backdrop-blur-lg shadow-lg shadow-black/20" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img src={geniusLogo} alt="Genius" className="h-9 w-9" />
            <span className="font-bold text-lg hidden sm:inline" style={{ fontFamily: "'Syne', sans-serif" }}>Genius Chatbot</span>
          </div>

          {/* Center links – desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="text-sm text-white/70 hover:text-white transition-colors">{l.label}</button>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "it" ? "en" : "it")}
              className="text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20 hover:border-[#E94560] hover:text-[#E94560] transition-colors"
            >
              {lang === "it" ? "EN" : "IT"}
            </button>
            <Link to="/login" className="hidden sm:block">
              <Button className="bg-[#E94560] hover:bg-[#d63b54] text-white text-sm h-9 px-5 rounded-full">
                {t("Start Free Trial", "Inizia Gratis")}
              </Button>
            </Link>
            <button className="md:hidden text-white" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-[#1A1A2E]/95 backdrop-blur-lg border-t border-white/10 px-6 pb-6 pt-4 space-y-4">
            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block text-sm text-white/70 hover:text-white">{l.label}</button>
            ))}
            <Link to="/login" onClick={() => setMobileMenu(false)}>
              <Button className="w-full bg-[#E94560] hover:bg-[#d63b54] text-white rounded-full mt-2">
                {t("Start Free Trial", "Inizia Gratis")}
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <header className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* BG gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#1A1A2E]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E94560]/10 rounded-full blur-[120px]" />

        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-white/20 rounded-full" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              animation: `floatParticle ${4 + Math.random() * 6}s ease-in-out infinite ${Math.random() * 3}s`
            }} />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center gap-12">
          {/* Text */}
          <div className="flex-1 text-center md:text-left space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
              {t(
                "The AI Chatbot That Captures Leads While You Sleep",
                "Il Chatbot AI Che Cattura Contatti Mentre Dormi"
              )}
            </h1>
            <p className="text-white/60 text-lg sm:text-xl max-w-xl mx-auto md:mx-0 leading-relaxed">
              {t(
                "Deploy a smart chatbot on your website in 5 minutes. Answer questions 24/7, capture leads automatically, and book consultations — all on autopilot.",
                "Installa un chatbot intelligente sul tuo sito in 5 minuti. Rispondi alle domande 24/7, cattura lead automaticamente e prenota consulenze — tutto in automatico."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/login">
                <Button className="bg-[#E94560] hover:bg-[#d63b54] text-white text-base h-12 px-8 rounded-full shadow-lg shadow-[#E94560]/25">
                  {t("Start Free Trial", "Inizia Gratis")}
                </Button>
              </Link>
              <Button variant="outline" onClick={() => { scrollTo("demo"); setVideoOpen(true); }} className="border-white/20 text-white hover:bg-white/10 h-12 px-8 rounded-full gap-2">
                <Play className="w-4 h-4" />
                {t("Watch Demo", "Guarda il Demo")}
              </Button>
            </div>
          </div>

          {/* Mascot */}
          <div className="flex-1 flex justify-center md:justify-end max-w-md w-full">
            <img
              src={genieMascot}
              alt="Genius Chatbot Genie"
              className="w-72 sm:w-96"
              style={{
                animation: "floatMascot 4s ease-in-out infinite",
                filter: "drop-shadow(0 0 30px hsl(349 78% 62% / 0.25))",
                mask: "radial-gradient(ellipse 80% 80% at center, black 50%, transparent 75%)",
                WebkitMask: "radial-gradient(ellipse 80% 80% at center, black 50%, transparent 75%)",
              }}
            />
          </div>
        </div>
      </header>

      {/* ─── SOCIAL PROOF ─── */}
      <Section className="py-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/40 text-sm mb-8 tracking-wider uppercase">
            {t("Trusted by forward-thinking businesses since 2004", "La fiducia delle imprese dal 2004")}
          </p>
          <div className="flex justify-center items-center gap-10 flex-wrap opacity-60">
            {[
              { src: logoSpedali, alt: "Spedali Civili di Brescia" },
              { src: logoUnimi, alt: "Università degli Studi di Milano" },
              { src: logoDtm, alt: "DTM" },
              { src: logoSaniplast, alt: "Saniplast" },
              { src: logoZerotrenta, alt: "Zerotrenta" },
              { src: logoCurtense, alt: "Curtense" },
            ].map((logo) => (
              <img key={logo.alt} src={logo.src} alt={logo.alt} className="h-8 sm:h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300 hover:opacity-100" />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FEATURES ─── */}
      <Section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("Everything You Need", "Tutto Ciò Che Ti Serve")}
          </h2>
          <p className="text-white/50 text-center mb-14 max-w-2xl mx-auto">
            {t("Powerful features to turn every website visitor into a lead.", "Funzionalità potenti per trasformare ogni visitatore in un contatto.")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🤖", en: "AI Conversations", it: "Conversazioni AI", descEn: "Trained on your business. Answers questions, handles objections, qualifies leads 24/7.", descIt: "Addestrato sul tuo business. Risponde, gestisce obiezioni e qualifica lead 24/7." },
              { icon: "📋", en: "Lead Capture", it: "Cattura Lead", descEn: "Never lose a visitor. When the bot can't answer, it captures their contact instantly.", descIt: "Nessun visitatore perso. Quando il bot non sa rispondere, cattura il contatto." },
              { icon: "📅", en: "Booking", it: "Prenotazioni", descEn: "Integrated Calendly. Visitors book meetings directly in the chat.", descIt: "Calendly integrato. I visitatori prenotano direttamente in chat." },
              { icon: "🎨", en: "Full Customization", it: "Personalizzazione", descEn: "Colors, avatar, tone of voice. Your chatbot, your brand.", descIt: "Colori, avatar, tono di voce. Il tuo chatbot, il tuo brand." },
              { icon: "🌍", en: "Multilingual", it: "Multilingua", descEn: "Speaks English and Italian. Auto-detects visitor language.", descIt: "Parla inglese e italiano. Rileva automaticamente la lingua del visitatore." },
              { icon: "📊", en: "Dashboard", it: "Dashboard", descEn: "Track leads, conversations, and conversions in real time.", descIt: "Monitora lead, conversazioni e conversioni in tempo reale." },
            ].map((f, i) => (
              <div key={i} className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#E94560]/30 rounded-2xl p-6 transition-all duration-300">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>{t(f.en, f.it)}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{t(f.descEn, f.descIt)}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── VIDEO DEMO ─── */}
      <Section id="demo" className="py-20 md:py-28 bg-gradient-to-b from-transparent via-[#16213E]/30 to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("See It In Action", "Guardalo in Azione")}
          </h2>
          <p className="text-white/50 mb-10">
            {t("Watch how Genius Chatbot captures a lead in under 2 minutes", "Guarda come Genius Chatbot cattura un lead in meno di 2 minuti")}
          </p>
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/30 bg-black/40">
            {videoOpen ? (
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Demo"
              />
            ) : (
              <button onClick={() => setVideoOpen(true)} className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/40 transition-colors group">
                <div className="w-20 h-20 rounded-full bg-[#E94560] flex items-center justify-center shadow-lg shadow-[#E94560]/30 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* ─── PRICING ─── */}
      <Section id="pricing" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("Simple, Transparent Pricing", "Prezzi Semplici e Trasparenti")}
          </h2>
          <p className="text-white/50 text-center mb-10 max-w-xl mx-auto">
            {t("Choose the plan that fits your business.", "Scegli il piano adatto al tuo business.")}
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mb-14">
            <span className={`text-sm ${!yearly ? "text-white" : "text-white/40"}`}>{t("Monthly", "Mensile")}</span>
            <button onClick={() => setYearly(!yearly)} className={`relative w-14 h-7 rounded-full transition-colors ${yearly ? "bg-[#E94560]" : "bg-white/20"}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${yearly ? "translate-x-7" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-sm ${yearly ? "text-white" : "text-white/40"}`}>{t("Yearly", "Annuale")}</span>
            {yearly && <span className="text-xs bg-[#E94560]/20 text-[#E94560] px-2 py-0.5 rounded-full font-medium">{t("2 months free", "2 mesi gratis")}</span>}
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Starter */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Starter</h3>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold">€{yearly ? "490" : "49"}</span>
                  <span className="text-white/40 text-sm">/{yearly ? t("year", "anno") : t("month", "mese")}</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                {[
                  t("1 chatbot", "1 chatbot"),
                  t("500 conversations/month", "500 conversazioni/mese"),
                  t("Lead capture + email notifications", "Cattura lead + notifiche email"),
                  t("Basic customization", "Personalizzazione base"),
                  t("Email support", "Supporto email"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-[#E94560] shrink-0 mt-0.5" />{item}</li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 rounded-full h-11"
                onClick={() => handleCheckout("starter")}
                disabled={!!checkoutLoading}
              >
                {checkoutLoading?.startsWith("starter") ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Get Started", "Inizia Ora")}
              </Button>
            </div>

            {/* Pro */}
            <div className="relative bg-gradient-to-br from-[#E94560]/10 to-transparent border-2 border-[#E94560]/40 rounded-2xl p-8 space-y-6 shadow-lg shadow-[#E94560]/10">
              <div className="absolute -top-3 right-6 bg-[#E94560] text-white text-xs font-bold px-3 py-1 rounded-full">{t("Most Popular", "Più Popolare")}</div>
              <div>
                <h3 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Pro</h3>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold">€{yearly ? "1490" : "149"}</span>
                  <span className="text-white/40 text-sm">/{yearly ? t("year", "anno") : t("month", "mese")}</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                {[
                  t("Unlimited chatbots", "Chatbot illimitati"),
                  t("Unlimited conversations", "Conversazioni illimitate"),
                  t("Calendly integration", "Integrazione Calendly"),
                  t("Full customization + avatar upload", "Personalizzazione completa + upload avatar"),
                  t("Analytics dashboard", "Dashboard analytics"),
                  t("Priority support", "Supporto prioritario"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2"><Check className="w-4 h-4 text-[#E94560] shrink-0 mt-0.5" />{item}</li>
                ))}
              </ul>
              <Button
                className="w-full bg-[#E94560] hover:bg-[#d63b54] text-white rounded-full h-11"
                onClick={() => handleCheckout("pro")}
                disabled={!!checkoutLoading}
              >
                {checkoutLoading?.startsWith("pro") ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Start Free Trial", "Inizia Gratis")}
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── TESTIMONIALS ─── */}
      <Section className="py-20 md:py-28 bg-gradient-to-b from-transparent via-[#16213E]/20 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-14" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("What Our Clients Say", "Cosa Dicono i Nostri Clienti")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Marco Bianchi", company: "Studio Legale Bianchi & Associati",
                en: "In just one week, the chatbot captured more leads than our contact form did in a month. Absolutely game-changing.",
                it: "In una sola settimana il chatbot ha catturato più contatti del nostro modulo in un mese. Assolutamente rivoluzionario."
              },
              {
                name: "Giulia Rossetti", company: "Rossetti Digital Agency",
                en: "Our clients love it. We embed a Genius chatbot on every website we build now. The ROI is immediate.",
                it: "I nostri clienti lo adorano. Ora integriamo un chatbot Genius su ogni sito che realizziamo. Il ROI è immediato."
              },
              {
                name: "Andrea Colombo", company: "Colombo Consulting S.r.l.",
                en: "Setup took literally 5 minutes. The AI handles questions I didn't even think visitors would ask.",
                it: "L'installazione ha richiesto letteralmente 5 minuti. L'AI gestisce domande che non avrei mai immaginato."
              },
            ].map((review, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-[#E94560] text-[#E94560]" />)}
                </div>
                <p className="text-white/70 text-sm leading-relaxed italic">"{t(review.en, review.it)}"</p>
                <div>
                  <p className="font-semibold text-sm">{review.name}</p>
                  <p className="text-white/40 text-xs">{review.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FINAL CTA ─── */}
      <Section className="py-20 md:py-28 bg-[#E94560]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
            {t("Ready to Never Miss a Lead Again?", "Pronto a Non Perdere Più Nessun Contatto?")}
          </h2>
          <p className="text-white/80 max-w-lg mx-auto">
            {t("Start your free trial today — no credit card required.", "Inizia la tua prova gratuita oggi — nessuna carta di credito richiesta.")}
          </p>
          <Link to="/login">
            <Button className="bg-white text-[#E94560] hover:bg-white/90 h-12 px-10 rounded-full text-base font-bold shadow-lg mt-2">
              {t("Start Free Trial", "Inizia Gratis")}
            </Button>
          </Link>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0F0F23] border-t border-white/5 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            {/* Left */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <img src={geniusLogo} alt="Genius" className="h-8 w-8" />
                <span className="font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Genius Chatbot</span>
              </div>
              <p className="text-white/40 text-sm">
                {t("The AI chatbot platform for modern businesses.", "La piattaforma di chatbot AI per le imprese moderne.")}
              </p>
            </div>

            {/* Center */}
            <div className="flex flex-col items-start md:items-center gap-2">
              <a href="#" className="text-sm text-white/50 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-sm text-white/50 hover:text-white transition-colors">{t("Terms of Service", "Termini di Servizio")}</a>
              <a href="#" className="text-sm text-white/50 hover:text-white transition-colors">{t("Contact", "Contatti")}</a>
            </div>

            {/* Right */}
            <div className="text-sm text-white/40 space-y-1 md:text-right">
              <p className="font-medium text-white/60">Genius Chatbot è un prodotto MDAC S.r.l.</p>
              <p>Via Padana Superiore, 173/A – 25035 Ospitaletto (BS)</p>
              <p>P.IVA 04333340984</p>
              <p>mdac@mdac.it | +39 030 68 40 636</p>
              <a href="https://www.mdac.agency" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">www.mdac.agency</a>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 text-center text-xs text-white/30">
            © 2025 Genius Chatbot Builder. {t("All rights reserved.", "Tutti i diritti riservati.")} {t("A product of", "Un prodotto")} MDAC S.r.l.
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
        @keyframes floatMascot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-30px) scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
