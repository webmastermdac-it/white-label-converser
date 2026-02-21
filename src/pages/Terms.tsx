import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Termini di Servizio</h1>
            <p className="text-sm text-gray-400 mb-8">Ultima modifica: Febbraio 2025</p>

            <h2>1. Descrizione del Servizio</h2>
            <p>
              Genius Chatbot Builder è una piattaforma SaaS che consente alle aziende di creare, personalizzare e integrare chatbot basati su intelligenza artificiale nei propri siti web. Il servizio include la cattura automatica di lead, notifiche email, e una dashboard di gestione.
            </p>

            <h2>2. Piani e Pagamenti</h2>
            <p>Il servizio è disponibile con i seguenti piani di abbonamento:</p>
            <ul>
              <li><strong>Starter</strong> — €49/mese: 1 chatbot, 500 conversazioni/mese, cattura lead, personalizzazione base, supporto email</li>
              <li><strong>Pro</strong> — €149/mese: chatbot illimitati, conversazioni illimitate, integrazioni avanzate, supporto prioritario, analytics avanzati</li>
            </ul>
            <p>
              Sono disponibili anche piani annuali con sconto. I pagamenti vengono elaborati tramite Stripe. L'abbonamento si rinnova automaticamente alla scadenza del periodo selezionato.
            </p>

            <h2>3. Obblighi dell'Utente</h2>
            <p>L'utente si impegna a:</p>
            <ul>
              <li>Non utilizzare il servizio per inviare spam o comunicazioni non richieste</li>
              <li>Non caricare contenuti illegali, diffamatori o che violino diritti di terzi</li>
              <li>Mantenere riservate le proprie credenziali di accesso</li>
              <li>Rispettare le normative vigenti in materia di protezione dei dati (GDPR)</li>
              <li>Non tentare di eludere le limitazioni del piano sottoscritto</li>
            </ul>

            <h2>4. Limitazione di Responsabilità</h2>
            <p>
              MDAC S.r.l. si impegna a garantire la continuità del servizio ma non può essere ritenuta responsabile per:
            </p>
            <ul>
              <li>Interruzioni del servizio dovute a cause di forza maggiore</li>
              <li>Perdita di dati causata da malfunzionamenti di terze parti</li>
              <li>Danni indiretti derivanti dall'utilizzo del servizio</li>
              <li>Risposte generate dall'intelligenza artificiale che risultino inesatte o inappropriate</li>
            </ul>
            <p>
              In ogni caso, la responsabilità di MDAC S.r.l. è limitata all'importo versato dall'utente nei 12 mesi precedenti.
            </p>

            <h2>5. Disdetta dell'Abbonamento</h2>
            <p>
              L'utente può disdire il proprio abbonamento in qualsiasi momento con un preavviso di <strong>30 giorni</strong>. La disdetta può essere effettuata dalla dashboard del cliente o contattando <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>.
            </p>
            <p>
              Alla scadenza dell'abbonamento, l'accesso al servizio viene disabilitato. I dati dell'utente vengono conservati per 30 giorni dalla disdetta, dopodiché vengono eliminati definitivamente.
            </p>

            <h2>6. Legge Applicabile e Foro Competente</h2>
            <p>
              I presenti Termini di Servizio sono regolati dalla <strong>legge italiana</strong>. Per qualsiasi controversia derivante dall'interpretazione o dall'esecuzione dei presenti termini, è competente in via esclusiva il <strong>Foro di Brescia</strong>.
            </p>

            <h2>7. Contatti</h2>
            <p>
              <strong>MDAC S.r.l.</strong><br />
              Via Padana Superiore 173/A, 25035 Ospitaletto (BS)<br />
              P.IVA 04333340984<br />
              Email: <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>
            </p>
          </article>
        ) : (
          <article className="prose prose-gray max-w-none">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Terms of Service</h1>
            <p className="text-sm text-gray-400 mb-8">Last updated: February 2025</p>

            <h2>1. Service Description</h2>
            <p>
              Genius Chatbot Builder is a SaaS platform that enables businesses to create, customize, and integrate AI-powered chatbots into their websites. The service includes automatic lead capture, email notifications, and a management dashboard.
            </p>

            <h2>2. Plans and Payments</h2>
            <p>The service is available with the following subscription plans:</p>
            <ul>
              <li><strong>Starter</strong> — €49/month: 1 chatbot, 500 conversations/month, lead capture, basic customization, email support</li>
              <li><strong>Pro</strong> — €149/month: unlimited chatbots, unlimited conversations, advanced integrations, priority support, advanced analytics</li>
            </ul>
            <p>
              Annual plans with discounts are also available. Payments are processed through Stripe. Subscriptions automatically renew at the end of the selected period.
            </p>

            <h2>3. User Obligations</h2>
            <p>The user agrees to:</p>
            <ul>
              <li>Not use the service to send spam or unsolicited communications</li>
              <li>Not upload illegal, defamatory content or content that infringes third-party rights</li>
              <li>Keep their login credentials confidential</li>
              <li>Comply with applicable data protection regulations (GDPR)</li>
              <li>Not attempt to circumvent the limitations of their subscribed plan</li>
            </ul>

            <h2>4. Limitation of Liability</h2>
            <p>
              MDAC S.r.l. is committed to ensuring service continuity but cannot be held liable for:
            </p>
            <ul>
              <li>Service interruptions due to force majeure</li>
              <li>Data loss caused by third-party malfunctions</li>
              <li>Indirect damages arising from the use of the service</li>
              <li>AI-generated responses that may be inaccurate or inappropriate</li>
            </ul>
            <p>
              In any case, MDAC S.r.l.'s liability is limited to the amount paid by the user in the preceding 12 months.
            </p>

            <h2>5. Subscription Cancellation</h2>
            <p>
              The user may cancel their subscription at any time with <strong>30 days' notice</strong>. Cancellation can be done from the client dashboard or by contacting <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>.
            </p>
            <p>
              Upon subscription expiry, access to the service is disabled. User data is retained for 30 days after cancellation, after which it is permanently deleted.
            </p>

            <h2>6. Governing Law and Jurisdiction</h2>
            <p>
              These Terms of Service are governed by <strong>Italian law</strong>. For any dispute arising from the interpretation or execution of these terms, the <strong>Court of Brescia</strong> shall have exclusive jurisdiction.
            </p>

            <h2>7. Contact</h2>
            <p>
              <strong>MDAC S.r.l.</strong><br />
              Via Padana Superiore 173/A, 25035 Ospitaletto (BS), Italy<br />
              VAT: IT04333340984<br />
              Email: <a href="mailto:mdac@mdac.it">mdac@mdac.it</a>
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
