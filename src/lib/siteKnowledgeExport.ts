import { verticals, type LocalizedText } from "@/content/verticals";

/**
 * Builds a plain-text export of the public website content (home + the three
 * vertical solution pages + pricing) so the platform bot can be kept in sync
 * with a single click, without any scraping.
 */

const pick = (text: LocalizedText, lang: "it" | "en") => (lang === "it" ? text.it : text.en);

const PRICING: { name: string; monthly: string; yearly: string; features: LocalizedText[] }[] = [
  {
    name: "Free",
    monthly: "0 €",
    yearly: "0 €",
    features: [
      { it: "1 chatbot personalizzato per il tuo settore", en: "1 custom chatbot for your business type" },
      { it: "50 conversazioni al mese", en: "50 conversations per month" },
      { it: "10 lead al mese", en: "10 leads per month" },
      { it: "Prompt di sistema (tono e ruolo del bot)", en: "System prompt (tone and bot role)" },
      { it: "5 FAQ manuali", en: "5 manual FAQs" },
      { it: "Supporto email", en: "Email support" },
      { it: "Non incluso: upload PDF/Word, Ricerca Avanzata RAG, integrazioni ecommerce, modulo Concierge Hotel", en: "Not included: PDF/Word upload, Advanced Search RAG, ecommerce integrations, Hotel Concierge module" },
    ],
  },
  {
    name: "Starter",
    monthly: "49 €",
    yearly: "490 €",
    features: [
      { it: "1 chatbot personalizzato per il tuo settore", en: "1 custom chatbot for your business type" },
      { it: "500 conversazioni al mese", en: "500 conversations per month" },
      { it: "Lead illimitati", en: "Unlimited leads" },
      { it: "FAQ illimitate", en: "Unlimited FAQs" },
      { it: "Upload PDF/Word e Ricerca Avanzata (RAG)", en: "PDF/Word upload and Advanced Search (RAG)" },
      { it: "Template di settore", en: "Industry templates" },
      { it: "Catalogo prodotti da feed XML/CSV con sincronizzazione giornaliera (fino a 100 prodotti)", en: "Product catalog from XML/CSV feed with daily sync (up to 100 products)" },
      { it: "Integrazione Calendly per gli appuntamenti", en: "Calendly integration for appointments" },
      { it: "Supporto prioritario", en: "Priority support" },
      { it: "Non incluso: analytics avanzati, ecommerce completo con webhook, modulo Concierge Hotel", en: "Not included: advanced analytics, full ecommerce with webhooks, Hotel Concierge module" },
    ],
  },
  {
    name: "Pro",
    monthly: "149 €",
    yearly: "1490 €",
    features: [
      { it: "1 chatbot personalizzato per il tuo settore", en: "1 custom chatbot for your business type" },
      { it: "Conversazioni e lead illimitati", en: "Unlimited conversations and leads" },
      { it: "Ricerca Avanzata (RAG) con priorità", en: "Advanced Search (RAG) with priority" },
      { it: "Ecommerce e catalogo completo: WooCommerce, Shopify, PrestaShop, API e webhook in tempo reale, prodotti a catalogo illimitati", en: "Full ecommerce & catalog: WooCommerce, Shopify, PrestaShop, API and real-time webhooks, unlimited catalog products" },
      { it: "Modulo Concierge Hotel: preventivi soggiorno, link al booking engine, QR per le camere, richieste degli ospiti in tempo reale e pagina Risultati", en: "Hotel Concierge module: stay quotes, booking engine link, room QR codes, real-time guest requests and Results page" },
      { it: "Canale Instagram DM", en: "Instagram DM channel" },
      { it: "Chiusura automatica delle chat inattive con email di riepilogo", en: "Automatic closing of inactive chats with recap email" },
      { it: "Analytics avanzati", en: "Advanced analytics" },
      { it: "White label completo (nessun branding Genius)", en: "Complete white label (no Genius branding)" },
      { it: "Supporto dedicato", en: "Dedicated support" },
    ],
  },
];

const HOME: Record<"it" | "en", { title: string; lines: string[] }[]> = {
  it: [
    {
      title: "Genius Chatbot — che cos'è",
      lines: [
        "Genius Chatbot è la piattaforma di assistenti AI di MDAC S.r.l. (agenzia di digital marketing attiva dal 2004, oltre 250 clienti).",
        "Un assistente AI per ogni attività: vende, fissa appuntamenti, accoglie gli ospiti.",
        "Si installa in 5 minuti, parla la lingua dei clienti e consegna contatti pronti.",
        "Sito: https://chatbot.your-genius.com — contatti: mdac@mdac.it",
      ],
    },
    {
      title: "Come funziona",
      lines: [
        "1. Crei l'account e scegli la soluzione adatta alla tua attività (ecommerce, appuntamenti, hotel).",
        "2. Il bot impara dai tuoi contenuti: FAQ, documenti PDF/Word, pagine del sito, catalogo prodotti o profilo della struttura.",
        "3. Copi una riga di codice nel sito e il widget è online, personalizzabile in colori, nome e avatar.",
        "4. In dashboard vedi conversazioni, lead, analytics e puoi esportare tutto in CSV.",
      ],
    },
    {
      title: "Funzionalità principali",
      lines: [
        "Risposte basate solo sui tuoi contenuti, senza informazioni inventate.",
        "Raccolta contatti in chat (nome e email oppure telefono), anche in modalità conversazionale.",
        "Ricerca Avanzata (RAG) sui documenti caricati, con indicizzazione semantica.",
        "Multilingua: risponde nella lingua dell'utente.",
        "Canali: sito web, pagina pubblica con QR, Instagram DM, email di notifica.",
        "Chiusura automatica delle chat inattive con email di riepilogo.",
        "Analytics: conversazioni, lead, pagine di origine, lingue, andamento nel tempo.",
      ],
    },
  ],
  en: [
    {
      title: "Genius Chatbot — what it is",
      lines: [
        "Genius Chatbot is the AI assistant platform by MDAC S.r.l. (digital marketing agency since 2004, over 250 clients).",
        "An AI assistant for every business: it sells, books appointments and welcomes guests.",
        "It installs in 5 minutes, speaks your customers' language and delivers ready-to-contact leads.",
        "Website: https://chatbot.your-genius.com — contact: mdac@mdac.it",
      ],
    },
    {
      title: "How it works",
      lines: [
        "1. Create your account and pick the solution that fits your business (ecommerce, appointments, hotel).",
        "2. The bot learns from your content: FAQs, PDF/Word documents, website pages, product catalog or property profile.",
        "3. Copy one line of code into your website and the widget is live, customizable in colors, name and avatar.",
        "4. In the dashboard you see conversations, leads, analytics and you can export everything to CSV.",
      ],
    },
    {
      title: "Key features",
      lines: [
        "Answers grounded only in your own content, with no invented information.",
        "Lead capture in chat (name and email or phone), including conversational mode.",
        "Advanced Search (RAG) over uploaded documents, with semantic indexing.",
        "Multilingual: it replies in the visitor's language.",
        "Channels: website, public page with QR code, Instagram DM, email notifications.",
        "Automatic closing of inactive chats with recap email.",
        "Analytics: conversations, leads, source pages, languages, trends over time.",
      ],
    },
  ],
};

const section = (title: string) => `\n\n## ${title}\n`;

function verticalBlock(lang: "it" | "en"): string {
  const isIt = lang === "it";
  return verticals
    .map((vertical) => {
      const lines: string[] = [];
      lines.push(section(`${pick(vertical.name, lang)} — https://chatbot.your-genius.com${vertical.path}`).trim());
      lines.push(pick(vertical.promise, lang));
      lines.push(pick(vertical.summary, lang));
      lines.push("");
      lines.push(isIt ? "Punti chiave:" : "Key points:");
      vertical.bullets.forEach((b) => lines.push(`- ${pick(b, lang)}`));

      if (vertical.stats?.length) {
        lines.push("", isIt ? "Numeri:" : "Numbers:");
        vertical.stats.forEach((s) => lines.push(`- ${pick(s.value, lang)}: ${pick(s.label, lang)}`));
      }

      if (vertical.problem) {
        lines.push("", pick(vertical.problem.title, lang));
        vertical.problem.items.forEach((i) => lines.push(`- ${pick(i, lang)}`));
      }

      if (vertical.journey) {
        lines.push("", pick(vertical.journey.title, lang));
        vertical.journey.moments.forEach((m) => lines.push(`- ${pick(m.label, lang)}: ${pick(m.description, lang)}`));
      }

      if (vertical.features?.length) {
        lines.push("", isIt ? "Funzionalità:" : "Features:");
        vertical.features.forEach((f) => {
          lines.push(`- ${pick(f.title, lang)}`);
          f.points.forEach((p) => lines.push(`  - ${pick(p, lang)}`));
        });
      }

      lines.push("", isIt ? "Benefici:" : "Benefits:");
      vertical.benefits.forEach((b) => lines.push(`- ${pick(b.title, lang)}: ${pick(b.description, lang)}`));

      lines.push("", isIt ? "Passaggi per partire:" : "Steps to get started:");
      vertical.steps.forEach((s, i) => lines.push(`${i + 1}. ${pick(s, lang)}`));

      if (vertical.integrationIntro) lines.push("", pick(vertical.integrationIntro, lang));
      lines.push("", `${isIt ? "Integrazioni" : "Integrations"}: ${vertical.integrations.map((i) => pick(i, lang)).join(", ")}`);

      if (vertical.service) {
        lines.push("", pick(vertical.service.title, lang));
        vertical.service.points.forEach((p) => lines.push(`- ${pick(p, lang)}`));
      }

      lines.push("", isIt ? "Domande frequenti:" : "FAQ:");
      vertical.faqs.forEach((f) => {
        lines.push(`D: ${pick(f.question, lang)}`);
        lines.push(`R: ${pick(f.answer, lang)}`);
      });

      return lines.join("\n");
    })
    .join("\n");
}

function pricingBlock(lang: "it" | "en"): string {
  const isIt = lang === "it";
  const lines: string[] = [];
  lines.push(section(isIt ? "Piani e prezzi (IVA esclusa)" : "Plans and pricing (VAT excluded)").trim());
  lines.push(
    isIt
      ? "Il piano annuale costa meno di 12 mensilità. Si inizia gratis, senza carta di credito, e si passa a un piano superiore quando serve."
      : "The yearly plan costs less than 12 monthly payments. You start free, with no credit card, and upgrade when you need to."
  );
  PRICING.forEach((plan) => {
    lines.push("", `### ${plan.name} — ${plan.monthly}/${isIt ? "mese" : "month"} · ${plan.yearly}/${isIt ? "anno" : "year"}`);
    plan.features.forEach((f) => lines.push(`- ${pick(f, lang)}`));
  });
  return lines.join("\n");
}

export function buildSiteKnowledgeText(): string {
  const parts: string[] = [];
  parts.push("# Genius Chatbot — contenuti del sito (esportazione automatica)");
  parts.push(`${new Date().toISOString()}`);

  (["it", "en"] as const).forEach((lang) => {
    parts.push(`\n\n=== ${lang === "it" ? "ITALIANO" : "ENGLISH"} ===`);
    HOME[lang].forEach((block) => {
      parts.push(section(block.title).trim());
      block.lines.forEach((line) => parts.push(line));
    });
    parts.push(verticalBlock(lang));
    parts.push(pricingBlock(lang));
  });

  return parts.join("\n");
}

export const SITE_KNOWLEDGE_SOURCE_NAME = "Contenuti sito Genius Chatbot";
