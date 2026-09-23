import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, CalendarCheck, Check, ChevronDown, Hotel, Menu, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import CookieBanner from "@/components/CookieBanner";
import VerticalDemoChat from "@/components/landing/VerticalDemoChat";
import { PricingGrid } from "@/pages/LandingPage";
import { getVertical, verticals, type VerticalId } from "@/content/verticals";
import { useLanguage } from "@/hooks/useLanguage";
import geniusLogo from "@/assets/genius.png";

const iconFor = (id: VerticalId) => id === "ecommerce" ? ShoppingCart : id === "booking" ? CalendarCheck : Hotel;

export default function VerticalLanding({ verticalId }: { verticalId: VerticalId }) {
  const { lang, setLang, t } = useLanguage();
  const vertical = getVertical(verticalId);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!vertical) return;
    document.title = vertical.seo.title[lang];
    const description = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    description?.setAttribute("content", vertical.seo.description[lang]);
    ogTitle?.setAttribute("content", vertical.seo.title[lang]);
    ogDescription?.setAttribute("content", vertical.seo.description[lang]);
    return () => {
      document.title = "Genius Chatbot | Assistenti AI per Ecommerce, Appuntamenti e Hotel";
      description?.setAttribute("content", "Scegli l'assistente AI per la tua attività: vende online, fissa appuntamenti o accoglie gli ospiti. Provalo gratis in 5 minuti.");
      ogTitle?.setAttribute("content", "Genius Chatbot | Un assistente AI per ogni attività");
      ogDescription?.setAttribute("content", "Assistenti AI per ecommerce, appuntamenti e hotel. Si installano in 5 minuti e trasformano le conversazioni in contatti pronti.");
    };
  }, [lang, vertical]);

  if (!vertical) return null;
  const Icon = iconFor(vertical.id);
  const localized = (text: { en: string; it: string }) => t(text.en, text.it);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0F1419] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0F1419]/90 shadow-lg shadow-black/30 backdrop-blur-lg" : "bg-transparent"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]">
            <img src={geniusLogo} alt="Genius" className="h-9 w-9" />
            <span className="hidden text-lg font-bold sm:inline" style={{ fontFamily: "'Syne', sans-serif" }}>Genius <span className="text-[#F5A623]">Chatbot</span></span>
          </Link>
          <div className="hidden items-center gap-7 lg:flex">
            <div className="relative">
              <Button variant="ghost" onClick={() => setSolutionsOpen((open) => !open)} className="h-auto gap-1 p-0 text-sm font-normal text-white/60 hover:bg-transparent hover:text-white" aria-expanded={solutionsOpen}>{t("Solutions", "Soluzioni")}<ChevronDown className="h-4 w-4" /></Button>
              {solutionsOpen && <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4"><div className="rounded-xl border border-white/10 bg-[#151B22] p-2 shadow-2xl shadow-black/40">{verticals.map((item) => <Link key={item.id} to={item.path} className={`block rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] ${item.id === vertical.id ? "bg-[#F5A623]/15 text-[#F5A623]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>{localized(item.name)}</Link>)}</div></div>}
            </div>
            <a href="#benefits" className="text-sm text-white/60 hover:text-white">{t("Benefits", "Benefici")}</a>
            <a href="#how-it-works" className="text-sm text-white/60 hover:text-white">{t("How it works", "Come funziona")}</a>
            <a href="#pricing" className="text-sm text-white/60 hover:text-white">{t("Pricing", "Prezzi")}</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setLang(lang === "it" ? "en" : "it")} className="h-7 rounded-full border-white/20 bg-transparent px-2.5 text-xs text-white hover:border-[#F5A623] hover:bg-transparent hover:text-[#F5A623]">{lang === "it" ? "EN" : "IT"}</Button>
            <Link to="/login" className="hidden text-sm text-white/60 hover:text-white sm:block">{t("Login", "Accedi")}</Link>
            <Link to={`/register?vertical=${vertical.id}`} className="hidden sm:block"><Button className="h-9 rounded-full border border-[#F5A623] bg-transparent px-5 text-[#F5A623] hover:bg-[#F5A623] hover:text-black">{t("Try Free", "Prova Gratis")}</Button></Link>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMobileMenu((open) => !open)} aria-label={t("Open menu", "Apri menu")}>{mobileMenu ? <X /> : <Menu />}</Button>
          </div>
        </div>
        {mobileMenu && <div className="border-t border-white/10 bg-[#0F1419]/95 px-6 pb-6 pt-4 backdrop-blur-lg lg:hidden"><p className="mb-3 text-xs font-semibold uppercase text-[#F5A623]">{t("Solutions", "Soluzioni")}</p><div className="space-y-3">{verticals.map((item) => <Link key={item.id} to={item.path} onClick={() => setMobileMenu(false)} className="block text-sm text-white/70">{localized(item.name)}</Link>)}<a href="#benefits" onClick={() => setMobileMenu(false)} className="block text-sm text-white/70">{t("Benefits", "Benefici")}</a><a href="#pricing" onClick={() => setMobileMenu(false)} className="block text-sm text-white/70">{t("Pricing", "Prezzi")}</a><Link to={`/register?vertical=${vertical.id}`}><Button className="mt-3 w-full rounded-full bg-[#F5A623] text-black">{t("Try Free", "Prova Gratis")}</Button></Link></div></div>}
      </nav>

      <main>
        <header className="relative overflow-hidden bg-gradient-to-br from-[#0F1419] via-[#1A1F2E] to-[#0F1419] pb-20 pt-28 md:pb-28 md:pt-36">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px]">
            <div className="text-center lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70"><Icon className="h-4 w-4 text-[#F5A623]" />{localized(vertical.name)}</div>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Syne', sans-serif" }}>{localized(vertical.promise)}</h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/55 lg:mx-0">{localized(vertical.summary)}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"><Link to={`/register?vertical=${vertical.id}`}><Button className="h-12 w-full rounded-full bg-[#F5A623] px-8 font-semibold text-black shadow-lg shadow-[#F5A623]/20 hover:bg-[#E09800] sm:w-auto">{t("Try free", "Prova gratis")}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link><a href="#how-it-works"><Button variant="outline" className="h-12 w-full rounded-full border-white/20 bg-white px-8 text-gray-900 hover:bg-white/90 sm:w-auto">{t("How it works", "Come funziona")}</Button></a></div>
            </div>
            <VerticalDemoChat vertical={vertical} />
          </div>
        </header>

        <section id="benefits" className="py-20 md:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6"><p className="mb-3 text-center text-sm font-semibold uppercase text-[#F5A623]">{t("Benefits", "Benefici")}</p><h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Built for your daily work", "Pensato per il tuo lavoro quotidiano")}</h2><div className="grid gap-6 md:grid-cols-3">{vertical.benefits.map((benefit) => <article key={benefit.title.it} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><Check className="mb-5 h-7 w-7 text-[#F5A623]" /><h3 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{localized(benefit.title)}</h3><p className="mt-3 text-sm leading-relaxed text-white/55">{localized(benefit.description)}</p></article>)}</div></div></section>

        <section id="how-it-works" className="bg-gradient-to-b from-transparent via-[#1A1F2E]/30 to-transparent py-20 md:py-28"><div className="mx-auto max-w-6xl px-4 sm:px-6"><p className="mb-3 text-center text-sm font-semibold uppercase text-[#F5A623]">{t("How it works", "Come funziona")}</p><h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Online in three steps", "Online in tre passi")}</h2><div className="grid gap-8 md:grid-cols-3">{vertical.steps.map((step, index) => <div key={step.it} className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5A623] text-lg font-bold text-black">{index + 1}</span><h3 className="mt-5 text-lg font-semibold">{localized(step)}</h3></div>)}</div></div></section>

        <section className="py-20 md:py-24"><div className="mx-auto max-w-5xl px-4 text-center sm:px-6"><p className="mb-3 text-sm font-semibold uppercase text-[#F5A623]">{t("Integrations", "Integrazioni")}</p><h2 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Fits the tools you already use", "Si integra con gli strumenti che usi già")}</h2>{vertical.integrationIntro && <p className="mx-auto mt-4 max-w-2xl text-white/55">{localized(vertical.integrationIntro)}</p>}<div className="mt-10 flex flex-wrap justify-center gap-3">{vertical.integrations.map((item) => <span key={item.it} className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/75">{localized(item)}</span>)}</div></div></section>

        <section className="bg-gradient-to-b from-transparent via-[#1A1F2E]/25 to-transparent py-20 md:py-24"><div className="mx-auto max-w-3xl px-4 sm:px-6"><p className="mb-3 text-center text-sm font-semibold uppercase text-[#F5A623]">FAQ</p><h2 className="mb-10 text-center text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Common questions", "Domande frequenti")}</h2><Accordion type="single" collapsible className="space-y-3">{vertical.faqs.map((faq, index) => <AccordionItem key={faq.question.it} value={`faq-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-5"><AccordionTrigger className="text-left hover:no-underline">{localized(faq.question)}</AccordionTrigger><AccordionContent className="leading-relaxed text-white/55">{localized(faq.answer)}</AccordionContent></AccordionItem>)}</Accordion></div></section>

        <section id="pricing" className="py-20 md:py-28"><div className="mx-auto max-w-5xl px-4 sm:px-6"><p className="mb-3 text-center text-sm font-semibold uppercase text-[#F5A623]">{t("Pricing", "Prezzi")}</p><h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Simple, transparent pricing", "Prezzi semplici e trasparenti")}</h2><p className="mx-auto mb-10 max-w-xl text-center text-white/50">{t("Choose the plan that fits your business.", "Scegli il piano più adatto al tuo business.")}</p><div className="mb-14 flex items-center justify-center gap-3"><span className={`text-sm ${!yearly ? "text-white" : "text-white/40"}`}>{t("Monthly", "Mensile")}</span><Button variant="ghost" onClick={() => setYearly((value) => !value)} className={`relative h-7 w-14 rounded-full p-0 hover:bg-white/20 ${yearly ? "bg-[#F5A623] hover:bg-[#F5A623]" : "bg-white/20"}`} aria-pressed={yearly}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${yearly ? "translate-x-3.5" : "-translate-x-3.5"}`} /></Button><span className={`text-sm ${yearly ? "text-white" : "text-white/40"}`}>{t("Yearly", "Annuale")}</span>{yearly && <span className="rounded-full bg-[#F5A623]/20 px-2 py-0.5 text-xs font-medium text-[#F5A623]">-20%</span>}</div><PricingGrid yearly={yearly} t={t} verticalId={vertical.id} /></div></section>

        <section className="py-20 md:py-28"><div className="mx-auto max-w-3xl px-4 text-center sm:px-6"><h2 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Your AI assistant is ready to get started", "Il tuo assistente AI è pronto a partire")}</h2><p className="mx-auto mt-4 max-w-lg text-white/50">{t("Start free today. No credit card required.", "Inizia gratis oggi. Nessuna carta di credito richiesta.")}</p><Link to={`/register?vertical=${vertical.id}`}><Button className="mt-8 h-12 rounded-full bg-[#F5A623] px-10 font-bold text-black shadow-lg shadow-[#F5A623]/20 hover:bg-[#E09800]">{t("Try free", "Prova gratis")}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div></section>
      </main>

      <footer className="border-t border-white/5 bg-[#0A0E13] py-14"><div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="grid gap-10 md:grid-cols-3"><div><div className="flex items-center gap-2.5"><img src={geniusLogo} alt="Genius" className="h-8 w-8" /><span className="font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Genius <span className="text-[#F5A623]">Chatbot</span></span></div><p className="mt-3 text-sm text-white/40">{t("The AI chatbot platform for modern businesses.", "La piattaforma di chatbot AI per le imprese moderne.")}</p></div><div className="flex flex-col items-start gap-2 md:items-center"><Link to="/privacy-policy" className="text-sm text-white/50 hover:text-white">Privacy Policy</Link><Link to="/terms" className="text-sm text-white/50 hover:text-white">{t("Terms of Service", "Termini di Servizio")}</Link><a href="mailto:mdac@mdac.it" className="text-sm text-white/50 hover:text-white">{t("Contact", "Contatti")}</a></div><div className="space-y-1 text-sm text-white/40 md:text-right"><p className="font-medium text-white/60">Genius Chatbot è un prodotto MDAC S.r.l.</p><p>Via Padana Superiore, 173/A – 25035 Ospitaletto (BS)</p><p>P.IVA 04333340984</p><p>mdac@mdac.it | +39 030 68 40 636</p></div></div><div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-white/30">© 2026 Genius Chatbot Builder. {t("All rights reserved.", "Tutti i diritti riservati.")}</div></div></footer>
      <CookieBanner />
    </div>
  );
}
