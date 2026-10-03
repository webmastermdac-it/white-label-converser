import Seo from "@/components/Seo";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock3, Gauge, ShieldCheck, Wrench } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import CookieBanner from "@/components/CookieBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import geniusLogo from "@/assets/genius.png";

export default function SetupAssistito() {
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const setupHref = user ? "/dashboard/upgrade#setup" : "/register?vertical=ecommerce";
  const localized = (text: { en: string; it: string }) => t(text.en, text.it);


  const services = [
    { it: "Contatto e analisi delle tue esigenze", en: "Contact and analysis of your needs" },
    { it: "Collegamento di WooCommerce, Shopify, PrestaShop, feed XML/CSV o API", en: "Connection of WooCommerce, Shopify, PrestaShop, XML/CSV feed or API" },
    { it: "Installazione del widget sul tuo sito", en: "Widget installation on your website" },
    { it: "Configurazione di prompt, FAQ e knowledge base", en: "Prompt, FAQ and knowledge base setup" },
    { it: "Test insieme a te", en: "Testing together with you" },
    { it: "Consigli su tone of voice e utilizzo", en: "Tips on tone of voice and usage" },
  ];
  const benefits = [
    { icon: ShieldCheck, title: { it: "Partenza senza errori", en: "Start without mistakes" }, text: { it: "Configurazione ottimizzata fin dal primo giorno.", en: "An optimized configuration from day one." } },
    { icon: Gauge, title: { it: "Risultati migliori", en: "Better results" }, text: { it: "Tono di voce e contenuti tarati da un team di digital marketing attivo dal 2004.", en: "Tone of voice and content calibrated by a digital marketing team active since 2004." } },
    { icon: Clock3, title: { it: "Tempo risparmiato", en: "Time saved" }, text: { it: "Tu non devi studiare chiavi API, feed e prompt.", en: "You don't have to learn about API keys, feeds and prompts." } },
  ];
  const steps = [
    { it: "Richiedi il setup e lasci il tuo telefono", en: "Request the setup and leave your phone number" },
    { it: "Ti contattiamo e configuriamo tutto con te", en: "We contact you and configure everything with you" },
    { it: "Il tuo chatbot è online e testato", en: "Your chatbot is online and tested" },
  ];
  const faqs = [
    { question: { it: "Serve un piano a pagamento?", en: "Do I need a paid plan?" }, answer: { it: "No, il setup è disponibile con qualsiasi piano, anche Free.", en: "No, the setup is available with any plan, including Free." } },
    { question: { it: "Come avviene il pagamento?", en: "How does payment work?" }, answer: { it: "Il pagamento è una tantum di €570, online e in modo sicuro tramite Stripe. Puoi inserire i dati per la fattura.", en: "Payment is a one-off €570, made securely online through Stripe. You can enter your invoice details." } },
    { question: { it: "Posso configurarlo da solo?", en: "Can I set it up myself?" }, answer: { it: "Sì, il setup è facoltativo: puoi configurare tutto in autonomia dalla dashboard.", en: "Yes, the setup is optional: you can configure everything yourself from the dashboard." } },
    { question: { it: "Con quali piattaforme lavorate?", en: "Which platforms do you work with?" }, answer: { it: "WooCommerce, Shopify, PrestaShop, feed XML/CSV e API per i cataloghi custom.", en: "WooCommerce, Shopify, PrestaShop, XML/CSV feeds and APIs for custom catalogs." } },
  ];

  const SetupCta = () => (
    <>
      <Link to={setupHref}><Button className="h-12 rounded-full bg-[#F5A623] px-8 font-bold text-black shadow-lg shadow-[#F5A623]/20 hover:bg-[#E09800]">{t("Request the setup", "Richiedi il setup")}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
      <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-white/40">{t("Available with any plan, including Free. After signing up you'll find the request in Dashboard → Upgrade.", "Disponibile con qualsiasi piano, anche Free. Dopo la registrazione trovi la richiesta in Dashboard → Upgrade.")}</p>
    </>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0F1419] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Seo title={t("Professional chatbot setup | Genius Chatbot", "Setup professionale chatbot | Genius Chatbot")} description={t("We connect your store or catalog, configure and test your AI chatbot with you. One-off €570.", "Colleghiamo il tuo store o catalogo, configuriamo e testiamo il chatbot AI con te. €570 una tantum.")} path="/setup-assistito" />
      <header className="border-b border-white/10 bg-[#0F1419]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5"><img src={geniusLogo} alt="Genius" className="h-9 w-9" /><span className="hidden text-lg font-bold sm:inline" style={{ fontFamily: "'Syne', sans-serif" }}>Genius <span className="text-[#F5A623]">Chatbot</span></span></Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setLang(lang === "it" ? "en" : "it")} className="h-7 rounded-full border-white/20 bg-transparent px-2.5 text-xs text-white hover:border-[#F5A623] hover:bg-transparent hover:text-[#F5A623]">{lang === "it" ? "EN" : "IT"}</Button>
            <Link to="/register?vertical=ecommerce"><Button className="h-9 rounded-full bg-[#F5A623] px-5 text-black hover:bg-[#E09800]">{t("Try free", "Prova gratis")}</Button></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0F1419] via-[#1A1F2E] to-[#0F1419] pb-20 pt-20 text-center md:pb-28 md:pt-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F5A623]/30 bg-[#F5A623]/10 px-4 py-1.5 text-sm text-[#F5A623]"><Wrench className="h-4 w-4" />{t("Professional setup", "Setup professionale")}</span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("We set it up. You focus on selling.", "Lo configuriamo noi. Tu pensi a vendere.")}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/55">{t("We contact you, connect your store or catalog, configure the chatbot and test it together with you.", "Ti contattiamo, colleghiamo il tuo store o il tuo catalogo, configuriamo il chatbot e lo testiamo insieme a te.")}</p>
            <p className="mt-6 text-2xl font-bold text-[#F5A623]">{t("€570 one-off", "€570 una tantum")}</p>
            <div className="mt-8"><SetupCta /></div>
          </div>
        </section>

        <section className="py-20 md:py-28"><div className="mx-auto max-w-5xl px-4 sm:px-6"><p className="mb-3 text-center text-sm font-semibold uppercase text-[#F5A623]">{t("What we do", "Cosa facciamo")}</p><h2 className="text-center text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Everything you need to get started", "Tutto quello che serve per partire")}</h2><div className="mt-10 grid gap-3 md:grid-cols-2">{services.map((item) => <div key={item.it} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#F5A623]" />{localized(item)}</div>)}</div></div></section>

        <section className="bg-gradient-to-b from-transparent via-[#1A1F2E]/30 to-transparent py-20 md:py-28"><div className="mx-auto max-w-6xl px-4 sm:px-6"><p className="mb-3 text-center text-sm font-semibold uppercase text-[#F5A623]">{t("Why let us do it", "Perché farlo fare a noi")}</p><div className="mt-10 grid gap-6 md:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <article key={title.it} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><Icon className="h-7 w-7 text-[#F5A623]" /><h3 className="mt-5 text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{localized(title)}</h3><p className="mt-3 text-sm leading-relaxed text-white/55">{localized(text)}</p></article>)}</div></div></section>

        <section className="py-20 md:py-28"><div className="mx-auto max-w-5xl px-4 sm:px-6"><p className="mb-3 text-center text-sm font-semibold uppercase text-[#F5A623]">{t("How it works", "Come funziona")}</p><div className="mt-10 grid gap-8 md:grid-cols-3">{steps.map((step, index) => <div key={step.it} className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5A623] text-lg font-bold text-black">{index + 1}</span><h3 className="mt-5 text-lg font-semibold">{localized(step)}</h3></div>)}</div></div></section>

        <section className="bg-gradient-to-b from-transparent via-[#1A1F2E]/25 to-transparent py-20 md:py-24"><div className="mx-auto max-w-3xl px-4 sm:px-6"><p className="mb-3 text-center text-sm font-semibold uppercase text-[#F5A623]">FAQ</p><h2 className="mb-10 text-center text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Common questions", "Domande frequenti")}</h2><Accordion type="single" collapsible className="space-y-3">{faqs.map((faq, index) => <AccordionItem key={faq.question.it} value={`faq-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-5"><AccordionTrigger className="text-left hover:no-underline">{localized(faq.question)}</AccordionTrigger><AccordionContent className="leading-relaxed text-white/55">{localized(faq.answer)}</AccordionContent></AccordionItem>)}</Accordion></div></section>

        <section className="py-20 text-center md:py-28"><div className="mx-auto max-w-3xl px-4 sm:px-6"><h2 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>{t("Ready to get started?", "Pronto a partire?")}</h2><div className="mt-8"><SetupCta /></div><p className="mt-6 text-sm text-white/50"><a href="mailto:mdac@mdac.it" className="hover:text-white">mdac@mdac.it</a> <span className="mx-2 text-white/20">|</span> <a href="tel:+390306840636" className="hover:text-white">+39 030 68 40 636</a></p></div></section>
      </main>

      <footer className="border-t border-white/5 bg-[#0A0E13] py-14"><div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="grid gap-10 md:grid-cols-3"><div><div className="flex items-center gap-2.5"><img src={geniusLogo} alt="Genius" className="h-8 w-8" /><span className="font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Genius <span className="text-[#F5A623]">Chatbot</span></span></div><p className="mt-3 text-sm text-white/40">{t("The AI chatbot platform for modern businesses.", "La piattaforma di chatbot AI per le imprese moderne.")}</p></div><div className="flex flex-col items-start gap-2 md:items-center"><Link to="/privacy-policy" className="text-sm text-white/50 hover:text-white">Privacy Policy</Link><Link to="/terms" className="text-sm text-white/50 hover:text-white">{t("Terms of Service", "Termini di Servizio")}</Link><a href="mailto:mdac@mdac.it" className="text-sm text-white/50 hover:text-white">{t("Contact", "Contatti")}</a></div><div className="space-y-1 text-sm text-white/40 md:text-right"><p className="font-medium text-white/60">Genius Chatbot è un prodotto MDAC S.r.l.</p><p>Via Padana Superiore, 173/A – 25035 Ospitaletto (BS)</p><p>P.IVA 04333340984</p><p>mdac@mdac.it | +39 030 68 40 636</p></div></div><div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-white/30">© 2026 Genius Chatbot Builder. {t("All rights reserved.", "Tutti i diritti riservati.")}</div></div></footer>
      <CookieBanner />
    </div>
  );
}