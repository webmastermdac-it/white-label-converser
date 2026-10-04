import PublicLanguageSelect from "@/components/PublicLanguageSelect";
import Seo from "@/components/Seo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  const { contentLang, lang, t } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title={t("Terms of Service | Genius Chatbot", "Termini di Servizio | Genius Chatbot")} description={t("Terms and conditions of Genius Chatbot, a service by MDAC S.r.l.: plans, payments, liability and cancellation.", "Termini e condizioni d'uso di Genius Chatbot, servizio di MDAC S.r.l.: piani, pagamenti, responsabilità e disdetta.")} path="/terms" />
      {/* Header bar */}
      <div className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <PublicLanguageSelect />
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Title block */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient" style={{ fontFamily: "'Syne', sans-serif" }}>
            {lang === "it" ? "Termini di Servizio" : "Terms of Service"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10 ml-[52px]">
          {lang === "it" ? "Ultima modifica: Ottobre 2026" : "Last updated: October 2026"}
        </p>

        {contentLang !== "it" && contentLang !== "en" && (
          <p role="note" className="mb-8 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            {t("The legal text is available in Italian and English; the Italian version prevails.", "Il testo giuridico è disponibile in italiano e inglese; fa fede la versione italiana.")}
          </p>
        )}
        {lang === "it" ? (
          <div className="space-y-8">
            <Section title="1. Descrizione del Servizio">
              <p>Genius Chatbot Builder è una piattaforma SaaS che consente alle aziende di creare, personalizzare e integrare chatbot basati su intelligenza artificiale nei propri siti web. Il servizio include la cattura automatica di lead, notifiche email, e una dashboard di gestione.</p>
            </Section>
            <Section title="2. Piani e Pagamenti">
              <p>Il servizio è disponibile con i seguenti piani di abbonamento:</p>
              <ul>
                <li><strong>Free</strong> — €0: 1 chatbot, 50 conversazioni/mese, 10 lead/mese, prompt di sistema (tono e ruolo del bot), 5 FAQ manuali, raccolta contatti in chat, risposte multilingua, supporto email e branding “Free Chatbot Genius” nel widget.</li>
                <li><strong>Starter</strong> — €49/mese o €490/anno: 1 chatbot, 500 conversazioni/mese, lead illimitati, prompt di sistema avanzato, FAQ illimitate, upload PDF/Word, importazione di pagine del sito e sitemap, supporto prioritario, Ricerca Avanzata (RAG), feed XML/CSV con sincronizzazione giornaliera, fino a 500 prodotti a catalogo e branding “Chatbot Genius” nel widget.</li>
                <li><strong>Pro</strong> — €149/mese o €1490/anno: 1 chatbot personalizzato per il settore, conversazioni e lead illimitati, tutte le funzionalità Starter, integrazione Calendly per gli appuntamenti, Ricerca Avanzata (RAG) in evidenza, ecommerce e catalogo completo con WooCommerce, Shopify, PrestaShop, API e webhook in tempo reale, fino a 100.000 prodotti a catalogo, Concierge Hotel, Instagram DM, chiusura automatica delle chat inattive con email di riepilogo, analytics avanzati, supporto dedicato e branding “Chatbot Genius” nel widget.</li>
              </ul>
              <p>Tutti i prezzi indicati sono IVA inclusa.</p>
              <p>Il piano Free può essere modificato o sospeso con un preavviso ragionevole. Gli abbonamenti si rinnovano automaticamente. Per la disdetta scrivere a <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a> prima della data di rinnovo. I pagamenti vengono elaborati tramite Stripe.</p>
            </Section>
            <Section title="3. Obblighi dell'Utente">
              <p>L'utente si impegna a:</p>
              <ul><li>Non utilizzare il servizio per inviare spam o comunicazioni non richieste</li><li>Non caricare contenuti illegali, diffamatori o che violino diritti di terzi</li><li>Mantenere riservate le proprie credenziali di accesso</li><li>Rispettare le normative vigenti in materia di protezione dei dati (GDPR)</li><li>Non tentare di eludere le limitazioni del piano sottoscritto</li></ul>
            </Section>
            <Section title="4. Limitazione di Responsabilità">
              <p>MDAC S.r.l. si impegna a garantire la continuità del servizio ma non può essere ritenuta responsabile per:</p>
              <ul><li>Interruzioni del servizio dovute a cause di forza maggiore</li><li>Perdita di dati causata da malfunzionamenti di terze parti</li><li>Danni indiretti derivanti dall'utilizzo del servizio</li><li>Risposte generate dall'intelligenza artificiale che risultino inesatte o inappropriate</li></ul>
              <p>In ogni caso, la responsabilità di MDAC S.r.l. è limitata all'importo versato dall'utente nei 12 mesi precedenti.</p>
            </Section>
            <Section title="5. Disdetta dell'Abbonamento">
              <p>Gli abbonamenti si rinnovano automaticamente. Per la disdetta scrivere a <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a> prima della data di rinnovo.</p>
              <p>Alla scadenza dell'abbonamento, l'accesso al servizio viene disabilitato. I dati dell'utente vengono conservati per 30 giorni dalla disdetta, dopodiché vengono eliminati definitivamente.</p>
            </Section>
            <Section title="6. Legge Applicabile e Foro Competente">
              <p>I presenti Termini di Servizio sono regolati dalla <strong>legge italiana</strong>. Per qualsiasi controversia è competente in via esclusiva il <strong>Foro di Brescia</strong>.</p>
            </Section>
            <Section title="7. Contatti">
              <p><strong className="text-primary">MDAC S.r.l.</strong><br />Via Padana Superiore 173/A, 25035 Ospitaletto (BS)<br />P.IVA 04333340984<br />Email: <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a></p>
            </Section>
          </div>
        ) : (
          <div className="space-y-8">
            <Section title="1. Service Description">
              <p>Genius Chatbot Builder is a SaaS platform that enables businesses to create, customize, and integrate AI-powered chatbots into their websites. The service includes automatic lead capture, email notifications, and a management dashboard.</p>
            </Section>
            <Section title="2. Plans and Payments">
              <p>The service is available with the following subscription plans:</p>
              <ul>
                <li><strong>Free</strong> — €0: 1 chatbot, 50 conversations/month, 10 leads/month, system prompt (tone and bot role), 5 manual FAQs, in-chat lead capture, multilingual replies, email support and “Free Chatbot Genius” branding in the widget.</li>
                <li><strong>Starter</strong> — €49/month or €490/year: 1 chatbot, 500 conversations/month, unlimited leads, advanced system prompt, unlimited FAQs, PDF/Word upload, website page and sitemap import, priority support, Advanced Search (RAG), daily XML/CSV feed sync, up to 500 catalog products and “Chatbot Genius” branding in the widget.</li>
                <li><strong>Pro</strong> — €149/month or €1490/year: 1 custom chatbot for the business type, unlimited conversations and leads, all Starter features, Calendly integration for appointments, highlighted Advanced Search (RAG), full ecommerce and catalog with WooCommerce, Shopify, PrestaShop, API and real-time webhooks, up to 100,000 catalog products, Hotel Concierge, Instagram DM, automatic closing of inactive chats with recap email, advanced analytics, dedicated support and “Chatbot Genius” branding in the widget.</li>
              </ul>
              <p>All prices shown include VAT.</p>
              <p>The Free plan may be changed or suspended with reasonable notice. Subscriptions renew automatically. To cancel, write to <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a> before the renewal date. Payments are processed through Stripe.</p>
            </Section>
            <Section title="3. User Obligations">
              <p>The user agrees to:</p>
              <ul><li>Not use the service to send spam or unsolicited communications</li><li>Not upload illegal, defamatory content or content that infringes third-party rights</li><li>Keep their login credentials confidential</li><li>Comply with applicable data protection regulations (GDPR)</li><li>Not attempt to circumvent the limitations of their subscribed plan</li></ul>
            </Section>
            <Section title="4. Limitation of Liability">
              <p>MDAC S.r.l. is committed to ensuring service continuity but cannot be held liable for:</p>
              <ul><li>Service interruptions due to force majeure</li><li>Data loss caused by third-party malfunctions</li><li>Indirect damages arising from the use of the service</li><li>AI-generated responses that may be inaccurate or inappropriate</li></ul>
              <p>In any case, MDAC S.r.l.'s liability is limited to the amount paid by the user in the preceding 12 months.</p>
            </Section>
            <Section title="5. Subscription Cancellation">
              <p>Subscriptions renew automatically. To cancel, write to <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a> before the renewal date.</p>
              <p>Upon subscription expiry, access to the service is disabled. User data is retained for 30 days after cancellation, after which it is permanently deleted.</p>
            </Section>
            <Section title="6. Governing Law and Jurisdiction">
              <p>These Terms of Service are governed by <strong>Italian law</strong>. For any dispute, the <strong>Court of Brescia</strong> shall have exclusive jurisdiction.</p>
            </Section>
            <Section title="7. Contact">
              <p><strong className="text-primary">MDAC S.r.l.</strong><br />Via Padana Superiore 173/A, 25035 Ospitaletto (BS), Italy<br />VAT: IT04333340984<br />Email: <a href="mailto:mdac@mdac.it" className="text-primary hover:underline">mdac@mdac.it</a></p>
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
