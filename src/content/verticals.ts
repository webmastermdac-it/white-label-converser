export type LocalizedText = { en: string; it: string };
export type VerticalId = "ecommerce" | "booking" | "hotel";

export interface VerticalContent {
  id: VerticalId;
  path: string;
  icon: "cart" | "calendar" | "hotel";
  name: LocalizedText;
  promise: LocalizedText;
  summary: LocalizedText;
  bullets: LocalizedText[];
  badges: string[];
  demo: { user: LocalizedText; assistant: LocalizedText };
  benefits: { title: LocalizedText; description: LocalizedText }[];
  steps: LocalizedText[];
  integrations: LocalizedText[];
  integrationIntro?: LocalizedText;
  faqs: { question: LocalizedText; answer: LocalizedText }[];
  seo: { title: LocalizedText; description: LocalizedText };
}

export const verticals: VerticalContent[] = [
  {
    id: "ecommerce",
    path: "/chatbot-ecommerce",
    icon: "cart",
    name: { it: "Chatbot Ecommerce", en: "Ecommerce Chatbot" },
    promise: { it: "Il commesso che conosce tutto il catalogo", en: "The sales assistant who knows your entire catalog" },
    summary: { it: "Trasforma ogni visita in un consiglio d'acquisto utile, anche quando il tuo team non è online.", en: "Turn every visit into a helpful shopping recommendation, even when your team is offline." },
    bullets: [
      { it: "Consiglia i prodotti giusti", en: "Recommends the right products" },
      { it: "Risponde su taglie, disponibilità e spedizioni", en: "Answers about sizes, availability and shipping" },
      { it: "Stato dell'ordine e contatti di chi sta per abbandonare", en: "Order status and contacts from shoppers about to leave" },
    ],
    badges: ["WooCommerce", "Shopify", "PrestaShop"],
    demo: {
      user: { it: "Avete questa giacca in M?", en: "Do you have this jacket in size M?" },
      assistant: { it: "Sì, disponibile in M nei colori blu e nero, spedizione in 24/48h. Vuoi il link?", en: "Yes, it's available in M in blue and black, with delivery in 24–48 hours. Would you like the link?" },
    },
    benefits: [
      { title: { it: "Vende anche di notte", en: "Sells while you sleep" }, description: { it: "Consiglia prodotti e risponde sulle varianti mentre il negozio dorme.", en: "Recommends products and answers variant questions while your store sleeps." } },
      { title: { it: "Meno ticket al servizio clienti", en: "Fewer support tickets" }, description: { it: "Stato ordine, spedizioni e resi gestiti direttamente in chat.", en: "Order status, shipping and returns handled directly in chat." } },
      { title: { it: "Recupera chi sta per andarsene", en: "Recovers shoppers before they leave" }, description: { it: "Raccoglie il contatto e lo passa a te quando serve intervenire.", en: "Captures their contact and hands it to you when human help is needed." } },
    ],
    steps: [
      { it: "Collega lo store", en: "Connect your store" },
      { it: "Il bot impara il catalogo", en: "The bot learns your catalog" },
      { it: "Installa il widget", en: "Install the widget" },
    ],
    integrations: [{ it: "WooCommerce", en: "WooCommerce" }, { it: "Shopify", en: "Shopify" }, { it: "PrestaShop", en: "PrestaShop" }],
    faqs: [
      { question: { it: "Con quali piattaforme funziona?", en: "Which platforms does it work with?" }, answer: { it: "Si collega a WooCommerce, Shopify e PrestaShop, oltre a cataloghi tramite feed compatibili.", en: "It connects to WooCommerce, Shopify and PrestaShop, plus catalogs through compatible feeds." } },
      { question: { it: "Si aggiorna quando cambio prezzi o disponibilità?", en: "Does it update when I change prices or availability?" }, answer: { it: "Sì. Il catalogo viene sincronizzato per mantenere aggiornati prezzi, varianti e disponibilità.", en: "Yes. The catalog is synchronized to keep prices, variants and availability up to date." } },
      { question: { it: "Può dire lo stato di un ordine?", en: "Can it provide an order status?" }, answer: { it: "Sì, può verificare lo stato dell'ordine con i dati forniti dal cliente, senza esporre informazioni riservate.", en: "Yes, it can check order status using the details provided by the customer, without exposing private information." } },
      { question: { it: "Posso provarlo gratis?", en: "Can I try it for free?" }, answer: { it: "Sì. Puoi iniziare gratuitamente e passare a un piano superiore quando ti serve.", en: "Yes. You can start for free and move to a higher plan when you need it." } },
    ],
    seo: {
      title: { it: "Chatbot Ecommerce AI | Genius Chatbot", en: "AI Ecommerce Chatbot | Genius Chatbot" },
      description: { it: "Un chatbot AI per ecommerce che consiglia prodotti, risponde su varianti e spedizioni e recupera contatti pronti all'acquisto.", en: "An AI ecommerce chatbot that recommends products, answers about variants and shipping, and captures purchase-ready contacts." },
    },
  },
  {
    id: "booking",
    path: "/chatbot-appuntamenti",
    icon: "calendar",
    name: { it: "Chatbot Appuntamenti", en: "Appointment Chatbot" },
    promise: { it: "La segreteria che non mette mai in attesa", en: "The receptionist who never puts anyone on hold" },
    summary: { it: "Informa, qualifica e porta il cliente fino alla prenotazione, senza telefonate perse.", en: "Inform, qualify and guide customers to booking, without missed calls." },
    bullets: [
      { it: "Spiega servizi e prezzi", en: "Explains services and prices" },
      { it: "Qualifica il cliente", en: "Qualifies the customer" },
      { it: "Fissa l'appuntamento in calendario", en: "Books the appointment in your calendar" },
    ],
    badges: ["Studi medici", "Estetica", "Consulenti", "Calendly"],
    demo: {
      user: { it: "Quanto costa una pulizia dei denti?", en: "How much does a dental cleaning cost?" },
      assistant: { it: "Da 80 €. Ho posto giovedì alle 15:30 o venerdì alle 10:00, quale preferisci?", en: "From €80. I have availability Thursday at 3:30 pm or Friday at 10:00 am. Which do you prefer?" },
    },
    benefits: [
      { title: { it: "Zero chiamate perse", en: "Zero missed calls" }, description: { it: "Risponde subito alle richieste, anche fuori orario e mentre sei con un cliente.", en: "Answers immediately, even after hours and while you're with a client." } },
      { title: { it: "Clienti già qualificati", en: "Pre-qualified clients" }, description: { it: "Sai chi è e cosa vuole prima che arrivi.", en: "Know who they are and what they need before they arrive." } },
      { title: { it: "Agenda sempre piena", en: "A fuller calendar" }, description: { it: "Propone gli slot liberi e accompagna il cliente alla prenotazione.", en: "Suggests open slots and guides the customer through booking." } },
    ],
    steps: [
      { it: "Descrivi servizi e prezzi", en: "Describe services and prices" },
      { it: "Collega il calendario", en: "Connect your calendar" },
      { it: "Installa il widget", en: "Install the widget" },
    ],
    integrations: [{ it: "Calendly", en: "Calendly" }, { it: "Studi medici", en: "Medical practices" }, { it: "Centri estetici", en: "Beauty centers" }, { it: "Consulenti", en: "Consultants" }],
    faqs: [
      { question: { it: "Funziona con il mio calendario?", en: "Does it work with my calendar?" }, answer: { it: "Puoi collegare Calendly e guidare il cliente direttamente agli orari disponibili.", en: "You can connect Calendly and guide customers directly to available time slots." } },
      { question: { it: "Può dare consigli medici?", en: "Can it give medical advice?" }, answer: { it: "No. Informa sui servizi e indirizza il cliente, ma non formula diagnosi né sostituisce un professionista.", en: "No. It explains services and directs the customer, but does not diagnose or replace a healthcare professional." } },
      { question: { it: "In quali lingue risponde?", en: "Which languages does it speak?" }, answer: { it: "Riconosce la lingua del visitatore e risponde nella stessa lingua.", en: "It detects the visitor's language and replies in the same language." } },
      { question: { it: "Posso provarlo gratis?", en: "Can I try it for free?" }, answer: { it: "Sì. Puoi configurarlo e iniziare gratuitamente, senza carta di credito.", en: "Yes. You can configure it and start for free, with no credit card required." } },
    ],
    seo: {
      title: { it: "Chatbot AI per Appuntamenti | Genius Chatbot", en: "AI Appointment Chatbot | Genius Chatbot" },
      description: { it: "La segreteria AI che spiega servizi e prezzi, qualifica i clienti e li porta alla prenotazione in calendario.", en: "The AI receptionist that explains services and prices, qualifies customers, and guides them to calendar booking." },
    },
  },
  {
    id: "hotel",
    path: "/concierge-hotel",
    icon: "hotel",
    name: { it: "Concierge Hotel", en: "Hotel Concierge" },
    promise: { it: "La reception che non chiude mai", en: "The front desk that never closes" },
    summary: { it: "Accoglie gli ospiti in ogni lingua e trasforma le richieste in prenotazioni dirette.", en: "Welcomes guests in every language and turns enquiries into direct bookings." },
    bullets: [
      { it: "Risponde agli ospiti in ogni lingua", en: "Answers guests in every language" },
      { it: "Trasforma le domande in preventivi con link al tuo booking engine", en: "Turns questions into quotes linked to your booking engine" },
      { it: "Profilo struttura importato dal tuo sito", en: "Imports your property profile from your website" },
    ],
    badges: ["Hotel", "B&B", "Resort", "Agriturismi"],
    demo: {
      user: { it: "Avete una camera per 2 dal 12 al 14?", en: "Do you have a room for two from the 12th to the 14th?" },
      assistant: { it: "La Superior vista lago parte da 140 € a notte con colazione. Ti preparo il link per verificare e prenotare?", en: "The Lake View Superior starts from €140 per night with breakfast. Shall I prepare the link to check and book?" },
    },
    benefits: [
      { title: { it: "Reception 24/7 in ogni lingua", en: "A 24/7 front desk in every language" }, description: { it: "Gli ospiti ricevono risposte immediate prima e durante il soggiorno.", en: "Guests get immediate answers before and during their stay." } },
      { title: { it: "Più prenotazioni dirette", en: "More direct bookings" }, description: { it: "Ogni richiesta diventa un preventivo con link al tuo booking engine, con meno commissioni alle OTA.", en: "Every enquiry becomes a quote linked to your booking engine, reducing OTA commissions." } },
      { title: { it: "Setup in 10 minuti", en: "Set up in 10 minutes" }, description: { it: "Importa camere, servizi e policy direttamente dal tuo sito.", en: "Import rooms, services and policies directly from your website." } },
    ],
    steps: [
      { it: "Importa il profilo dal sito", en: "Import the property profile from your website" },
      { it: "Collega il link del booking engine", en: "Connect your booking engine link" },
      { it: "Installa il widget", en: "Install the widget" },
    ],
    integrations: [{ it: "Qualsiasi booking engine", en: "Any booking engine" }],
    integrationIntro: { it: "Compatibile con qualsiasi booking engine tramite link di prenotazione precompilato.", en: "Compatible with any booking engine through a pre-filled booking link." },
    faqs: [
      { question: { it: "Serve un'integrazione con il mio booking engine?", en: "Do I need an integration with my booking engine?" }, answer: { it: "No, basta il link del booking engine. Genius lo precompila con date e numero di ospiti.", en: "No, the booking engine link is enough. Genius pre-fills it with dates and guest numbers." } },
      { question: { it: "Il bot inventa prezzi o disponibilità?", en: "Does the bot invent prices or availability?" }, answer: { it: "No. Indica i prezzi solo come «a partire da» e invita sempre l'ospite a verificare la disponibilità.", en: "No. It only presents prices as “starting from” and always asks guests to verify availability." } },
      { question: { it: "Risponde agli ospiti stranieri?", en: "Does it answer international guests?" }, answer: { it: "Sì. Riconosce la lingua dell'ospite e risponde automaticamente nella stessa lingua.", en: "Yes. It detects the guest's language and automatically replies in that language." } },
      { question: { it: "Posso provarlo gratis?", en: "Can I try it for free?" }, answer: { it: "Sì. Puoi importare il profilo e provarlo gratuitamente, senza carta di credito.", en: "Yes. You can import your profile and try it for free, with no credit card required." } },
    ],
    seo: {
      title: { it: "Concierge Hotel AI | Genius Chatbot", en: "AI Hotel Concierge | Genius Chatbot" },
      description: { it: "Il concierge AI multilingue per hotel, B&B e resort che risponde 24/7 e porta gli ospiti alla prenotazione diretta.", en: "The multilingual AI concierge for hotels, B&Bs and resorts that answers 24/7 and drives direct bookings." },
    },
  },
];

export const getVertical = (id: string | undefined) => verticals.find((vertical) => vertical.id === id);
