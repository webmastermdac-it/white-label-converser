import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const { lang: globalLang } = useLanguage();
  const [lang, setLang] = useState<"it" | "en">(globalLang);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <button
            onClick={() => setLang(lang === "it" ? "en" : "it")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-300 hover:border-gray-500 transition-colors"
          >
            {lang === "it" ? "🇬🇧 English" : "🇮🇹 Italiano"}
          </button>
        </div>

        {lang === "it" ? (
          <article className="prose prose-gray max-w-none">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Informativa sulla Privacy</h1>
            <p className="text-sm text-gray-400 mb-8">Ultima modifica: Febbraio 2025</p>

            <h2>1. Titolare del Trattamento</h2>
            <p>
              <strong>MDAC S.r.l.</strong><br />
              Via Padana Superiore 173/A, 25035 Ospitaletto (BS)<br />
              P.IVA 04333340984<br />
              Email: <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>
            </p>

            <h2>2. Dati Raccolti</h2>
            <p>Raccogliamo i seguenti dati personali:</p>
            <ul>
              <li>Nome e cognome</li>
              <li>Indirizzo email</li>
              <li>Numero di telefono (se fornito)</li>
              <li>Messaggi scambiati tramite il chatbot</li>
              <li>Cookie tecnici necessari al funzionamento del servizio</li>
            </ul>

            <h2>3. Finalità del Trattamento</h2>
            <p>I dati vengono trattati per le seguenti finalità:</p>
            <ul>
              <li>Erogazione del servizio Genius Chatbot Builder</li>
              <li>Invio di notifiche email relative ai lead catturati</li>
              <li>Miglioramento del prodotto e dell'esperienza utente</li>
            </ul>

            <h2>4. Base Giuridica</h2>
            <p>
              Il trattamento dei dati si basa su:<br />
              • <strong>Esecuzione del contratto</strong> (Art. 6.1.b GDPR) per l'erogazione del servizio<br />
              • <strong>Consenso dell'interessato</strong> (Art. 6.1.a GDPR) per comunicazioni promozionali
            </p>

            <h2>5. Conservazione dei Dati</h2>
            <p>
              I dati personali vengono conservati per un periodo massimo di <strong>24 mesi</strong> dalla raccolta, salvo obblighi di legge che ne richiedano una conservazione più lunga.
            </p>

            <h2>6. Diritti dell'Utente</h2>
            <p>In conformità con il GDPR, hai il diritto di:</p>
            <ul>
              <li><strong>Accesso</strong> — ottenere conferma dell'esistenza dei tuoi dati e richiederne una copia</li>
              <li><strong>Rettifica</strong> — correggere dati inesatti o incompleti</li>
              <li><strong>Cancellazione</strong> — richiedere la cancellazione dei tuoi dati (Art. 17 GDPR, "diritto all'oblio")</li>
              <li><strong>Portabilità</strong> — ricevere i tuoi dati in formato strutturato</li>
              <li><strong>Opposizione</strong> — opporti al trattamento dei tuoi dati</li>
            </ul>
            <p>
              Per esercitare i tuoi diritti, contatta il DPO all'indirizzo: <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>
            </p>

            <h2>7. Contatto DPO</h2>
            <p>
              Per qualsiasi domanda relativa al trattamento dei dati personali, puoi contattare il Responsabile della Protezione dei Dati:<br />
              Email: <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>
            </p>

            <h2>8. Cookie</h2>
            <p>
              Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento della piattaforma. Non vengono utilizzati cookie di profilazione senza il consenso esplicito dell'utente.
            </p>
          </article>
        ) : (
          <article className="prose prose-gray max-w-none">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Privacy Policy</h1>
            <p className="text-sm text-gray-400 mb-8">Last updated: February 2025</p>

            <h2>1. Data Controller</h2>
            <p>
              <strong>MDAC S.r.l.</strong><br />
              Via Padana Superiore 173/A, 25035 Ospitaletto (BS), Italy<br />
              VAT: IT04333340984<br />
              Email: <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>
            </p>

            <h2>2. Data Collected</h2>
            <p>We collect the following personal data:</p>
            <ul>
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number (if provided)</li>
              <li>Chat messages exchanged through the chatbot</li>
              <li>Technical cookies necessary for service operation</li>
            </ul>

            <h2>3. Purpose of Processing</h2>
            <p>Data is processed for the following purposes:</p>
            <ul>
              <li>Delivery of the Genius Chatbot Builder service</li>
              <li>Sending email notifications about captured leads</li>
              <li>Product and user experience improvement</li>
            </ul>

            <h2>4. Legal Basis</h2>
            <p>
              Data processing is based on:<br />
              • <strong>Performance of a contract</strong> (Art. 6.1.b GDPR) for service delivery<br />
              • <strong>Consent</strong> (Art. 6.1.a GDPR) for promotional communications
            </p>

            <h2>5. Data Retention</h2>
            <p>
              Personal data is retained for a maximum period of <strong>24 months</strong> from collection, unless legal obligations require longer retention.
            </p>

            <h2>6. User Rights</h2>
            <p>In accordance with the GDPR, you have the right to:</p>
            <ul>
              <li><strong>Access</strong> — obtain confirmation of your data's existence and request a copy</li>
              <li><strong>Rectification</strong> — correct inaccurate or incomplete data</li>
              <li><strong>Erasure</strong> — request deletion of your data (Art. 17 GDPR, "right to be forgotten")</li>
              <li><strong>Portability</strong> — receive your data in a structured format</li>
              <li><strong>Objection</strong> — object to the processing of your data</li>
            </ul>
            <p>
              To exercise your rights, contact the DPO at: <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>
            </p>

            <h2>7. DPO Contact</h2>
            <p>
              For any questions regarding personal data processing, you can contact the Data Protection Officer:<br />
              Email: <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>
            </p>

            <h2>8. Cookies</h2>
            <p>
              This website only uses technical cookies necessary for the platform's operation. No profiling cookies are used without the user's explicit consent.
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
