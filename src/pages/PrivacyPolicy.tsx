import Seo from "@/components/Seo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  const { lang: globalLang } = useLanguage();
  const [lang, setLang] = useState<"it" | "en">(globalLang);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title={lang === "it" ? "Informativa Privacy | Genius Chatbot" : "Privacy Policy | Genius Chatbot"} description={lang === "it" ? "Come MDAC S.r.l. tratta i dati personali in Genius Chatbot: dati raccolti, finalità, conservazione e diritti GDPR." : "How MDAC S.r.l. processes personal data in Genius Chatbot: data collected, purposes, retention and GDPR rights."} path="/privacy-policy" />
      {/* Header bar */}
      <div className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <button
            onClick={() => setLang(lang === "it" ? "en" : "it")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:text-primary transition-colors"
          >
            {lang === "it" ? "🇬🇧 English" : "🇮🇹 Italiano"}
          </button>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Title block */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient" style={{ fontFamily: "'Syne', sans-serif" }}>
            {lang === "it" ? "Informativa sulla Privacy" : "Privacy Policy"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10 ml-[52px]">
          {lang === "it" ? "Ultima modifica: Febbraio 2025" : "Last updated: February 2025"}
        </p>

        {lang === "it" ? (
          <div className="space-y-8">
            <Section title="1. Titolare del Trattamento">
              <p><strong className="text-primary">MDAC S.r.l.</strong><br />Via Padana Superiore 173/A, 25035 Ospitaletto (BS)<br />P.IVA 04333340984<br />Email: <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a></p>
            </Section>
            <Section title="2. Dati Raccolti">
              <p>Raccogliamo i seguenti dati personali:</p>
              <ul><li>Nome e cognome</li><li>Indirizzo email</li><li>Numero di telefono (se fornito)</li><li>Messaggi scambiati tramite il chatbot</li><li>Cookie tecnici necessari al funzionamento del servizio</li></ul>
            </Section>
            <Section title="3. Finalità del Trattamento">
              <p>I dati vengono trattati per le seguenti finalità:</p>
              <ul><li>Erogazione del servizio Genius Chatbot Builder</li><li>Invio di notifiche email relative ai lead catturati</li><li>Miglioramento del prodotto e dell'esperienza utente</li></ul>
            </Section>
            <Section title="4. Base Giuridica">
              <p>Il trattamento dei dati si basa su:<br />• <strong>Esecuzione del contratto</strong> (Art. 6.1.b GDPR) per l'erogazione del servizio<br />• <strong>Consenso dell'interessato</strong> (Art. 6.1.a GDPR) per comunicazioni promozionali</p>
            </Section>
            <Section title="5. Conservazione dei Dati">
              <p>I dati personali vengono conservati per un periodo massimo di <strong>24 mesi</strong> dalla raccolta, salvo obblighi di legge che ne richiedano una conservazione più lunga.</p>
            </Section>
            <Section title="6. Diritti dell'Utente">
              <p>In conformità con il GDPR, hai il diritto di:</p>
              <ul><li><strong>Accesso</strong> — ottenere conferma dell'esistenza dei tuoi dati e richiederne una copia</li><li><strong>Rettifica</strong> — correggere dati inesatti o incompleti</li><li><strong>Cancellazione</strong> — richiedere la cancellazione dei tuoi dati (Art. 17 GDPR)</li><li><strong>Portabilità</strong> — ricevere i tuoi dati in formato strutturato</li><li><strong>Opposizione</strong> — opporti al trattamento dei tuoi dati</li></ul>
              <p>Per esercitare i tuoi diritti, contatta il DPO: <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a></p>
            </Section>
            <Section title="7. Contatto DPO">
              <p>Per qualsiasi domanda relativa al trattamento dei dati personali:<br />Email: <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a></p>
            </Section>
            <Section title="8. Cookie">
              <p>Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento della piattaforma. Non vengono utilizzati cookie di profilazione senza il consenso esplicito dell'utente.</p>
            </Section>
          </div>
        ) : (
          <div className="space-y-8">
            <Section title="1. Data Controller">
              <p><strong className="text-primary">MDAC S.r.l.</strong><br />Via Padana Superiore 173/A, 25035 Ospitaletto (BS), Italy<br />VAT: IT04333340984<br />Email: <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a></p>
            </Section>
            <Section title="2. Data Collected">
              <p>We collect the following personal data:</p>
              <ul><li>Full name</li><li>Email address</li><li>Phone number (if provided)</li><li>Chat messages exchanged through the chatbot</li><li>Technical cookies necessary for service operation</li></ul>
            </Section>
            <Section title="3. Purpose of Processing">
              <p>Data is processed for the following purposes:</p>
              <ul><li>Delivery of the Genius Chatbot Builder service</li><li>Sending email notifications about captured leads</li><li>Product and user experience improvement</li></ul>
            </Section>
            <Section title="4. Legal Basis">
              <p>Data processing is based on:<br />• <strong>Performance of a contract</strong> (Art. 6.1.b GDPR) for service delivery<br />• <strong>Consent</strong> (Art. 6.1.a GDPR) for promotional communications</p>
            </Section>
            <Section title="5. Data Retention">
              <p>Personal data is retained for a maximum period of <strong>24 months</strong> from collection, unless legal obligations require longer retention.</p>
            </Section>
            <Section title="6. User Rights">
              <p>In accordance with the GDPR, you have the right to:</p>
              <ul><li><strong>Access</strong> — obtain confirmation of your data's existence and request a copy</li><li><strong>Rectification</strong> — correct inaccurate or incomplete data</li><li><strong>Erasure</strong> — request deletion of your data (Art. 17 GDPR)</li><li><strong>Portability</strong> — receive your data in a structured format</li><li><strong>Objection</strong> — object to the processing of your data</li></ul>
              <p>To exercise your rights, contact the DPO at: <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a></p>
            </Section>
            <Section title="7. DPO Contact">
              <p>For any questions regarding personal data processing:<br />Email: <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a></p>
            </Section>
            <Section title="8. Cookies">
              <p>This website only uses technical cookies necessary for the platform's operation. No profiling cookies are used without the user's explicit consent.</p>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-6">
      <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1 [&_li]:text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
