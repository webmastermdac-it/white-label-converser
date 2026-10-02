export type LocalizedText = { en: string; it: string };
export type VerticalId = "ecommerce" | "booking" | "hotel";

export const DEMO_URL = "mailto:mdac@mdac.it?subject=Demo%20Genius%20Concierge";

export type HotelFeatureKind = "quote" | "concierge" | "requests" | "results" | "import";

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
  stats?: { value: LocalizedText; label: LocalizedText }[];
  problem?: { title: LocalizedText; items: LocalizedText[] };
  journey?: { title: LocalizedText; moments: { label: LocalizedText; description: LocalizedText }[] };
  features?: { kind: HotelFeatureKind; title: LocalizedText; points: LocalizedText[] }[];
  roi?: { title: LocalizedText; note: LocalizedText };
  service?: { title: LocalizedText; points: LocalizedText[] };
  demoUrl?: string;
  finalCta?: LocalizedText;
}

export const verticals: VerticalContent[] = [
  {
    id: "ecommerce",
    path: "/chatbot-ecommerce",
    icon: "cart",
    name: { it: "Ecommerce & Catalogo", en: "Ecommerce & Catalog" },
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
      { question: { it: "Con quali piattaforme funziona?", en: "Which platforms does it work with?" }, answer: { it: "Si collega direttamente a WooCommerce, Shopify e PrestaShop. Per tutte le altre piattaforme e per i cataloghi custom puoi importare un feed XML/CSV o usare le API.", en: "It connects directly to WooCommerce, Shopify and PrestaShop. For every other platform and custom catalogs you can import an XML/CSV feed or use the API." } },
      { question: { it: "Non sono capace di configurarlo, mi aiutate?", en: "I'm not comfortable setting it up, can you help?" }, answer: { it: "Sì. Con il Setup professionale (€570 una tantum) ti contattiamo, colleghiamo lo store o il feed, configuriamo il chatbot e lo testiamo insieme a te.", en: "Yes. With the professional setup (€570 one-off) we contact you, connect your store or feed, configure the chatbot and test it together with you." } },
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
    promise: { it: "Il tuo hotel risponde sempre. Anche alle 3 di notte.", en: "Your hotel always answers. Even at 3 a.m." },
    summary: { it: "Genius Concierge risponde agli ospiti in ogni lingua, prepara il preventivo, lo porta sul tuo booking engine e raccoglie le richieste dalle camere. Più prenotazioni dirette, meno telefonate alla reception.", en: "Genius Concierge answers guests in every language, prepares their quote, guides them to your booking engine and collects requests from their rooms. More direct bookings, fewer calls to reception." },
    bullets: [
      { it: "Risponde agli ospiti in ogni lingua", en: "Answers guests in every language" },
      { it: "Trasforma le domande in preventivi con link al tuo booking engine", en: "Turns questions into quotes linked to your booking engine" },
      { it: "Profilo struttura importato dal tuo sito", en: "Imports your property profile from your website" },
    ],
    badges: ["Hotel", "B&B", "Resort", "Agriturismi"],
    demo: {
      user: { it: "Avete una camera per 2 adulti e un bambino dal 12 al 14 agosto?", en: "Do you have a room for 2 adults and a child from 12 to 14 August?" },
      assistant: { it: "Per tre persone ti consiglio la Family con vista lago: da 180 € a notte con colazione. Lasciami un contatto e ti preparo il preventivo.", en: "For three guests, I recommend the Lake View Family room: from €180 per night with breakfast. Leave me your contact details and I’ll prepare your quote." },
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
    stats: [
      { value: { it: "24/7", en: "24/7" }, label: { it: "sempre operativo", en: "always available" } },
      { value: { it: "Ogni lingua", en: "Every language" }, label: { it: "risponde nella lingua dell'ospite", en: "answers in the guest’s language" } },
      { value: { it: "0%", en: "0%" }, label: { it: "commissioni sulle prenotazioni", en: "booking commissions" } },
      { value: { it: "10 minuti", en: "10 minutes" }, label: { it: "per andare online", en: "to go live" } },
    ],
    problem: {
      title: { it: "Ogni domanda senza risposta è una prenotazione che finisce su un portale.", en: "Every unanswered question is a booking that ends up on a portal." },
      items: [
        { it: "Il telefono squilla durante i check-in", en: "The phone rings while guests are checking in" },
        { it: "Il preventivo parte il giorno dopo, quando l'ospite ha già prenotato altrove", en: "The quote goes out the next day, after the guest has already booked elsewhere" },
        { it: "L'ospite straniero scrive alle 23 e nessuno risponde", en: "An international guest writes at 11 p.m. and no one answers" },
      ],
    },
    journey: {
      title: { it: "Accanto all'ospite, dalla prima domanda al check-out", en: "By your guest’s side, from the first question to check-out" },
      moments: [
        { label: { it: "Prima di prenotare", en: "Before booking" }, description: { it: "Risponde su camere, servizi e policy, prepara il preventivo e porta l'ospite sul tuo booking engine", en: "Answers questions about rooms, services and policies, prepares the quote and guides the guest to your booking engine" } },
        { label: { it: "Durante il soggiorno", en: "During the stay" }, description: { it: "Con il QR in camera l'ospite chiede asciugamani, taxi o late check-out, scopre la guida locale e la reception riceve tutto in tempo reale", en: "With the in-room QR, guests request towels, a taxi or late check-out, explore your local guide and reception receives everything in real time" } },
      ],
    },
    features: [
      { kind: "quote", title: { it: "Dalla domanda al preventivo in 30 secondi", en: "From question to quote in 30 seconds" }, points: [
        { it: "Consiglia la camera giusta per il numero di ospiti", en: "Recommends the right room for the number of guests" },
        { it: "Prezzi «a partire da», mai inventati", en: "Starting-from prices, never invented" },
        { it: "Link precompilato al tuo booking engine", en: "A pre-filled link to your booking engine" },
        { it: "Email alla reception con date e ospiti in evidenza", en: "Reception email with dates and guests clearly highlighted" },
      ] },
      { kind: "concierge", title: { it: "Il concierge in camera, senza app", en: "An in-room concierge, with no app" }, points: [
        { it: "Un QR per ogni camera, pronto da stampare", en: "One printable QR code for every room" },
        { it: "L'ospite chiede con un tocco", en: "Guests make a request with one tap" },
        { it: "Guida locale: ristoranti, spiagge, trasporti", en: "Local guide: restaurants, beaches and transport" },
      ] },
      { kind: "requests", title: { it: "La reception vede tutto in tempo reale", en: "Reception sees everything in real time" }, points: [
        { it: "Notifica ed email a ogni richiesta", en: "A notification and email for every request" },
        { it: "Camera e richiesta sempre chiare", en: "Room and request are always clear" },
        { it: "Tempo medio di risposta sotto controllo", en: "Average response time stays under control" },
      ] },
      { kind: "results", title: { it: "Misuri quanto ti porta", en: "Measure the value it brings" }, points: [
        { it: "Vedi quanti ospiti porta sul tuo booking engine", en: "See how many guests it sends to your booking engine" },
        { it: "Quante richieste arrivano fuori orario", en: "See how many requests arrive after hours" },
        { it: "Lingue degli ospiti e mesi più richiesti", en: "Guest languages and most requested months" },
      ] },
      { kind: "import", title: { it: "Impara dal tuo sito in pochi minuti", en: "Learns from your website in minutes" }, points: [
        { it: "Camere, servizi e policy importati", en: "Rooms, services and policies imported" },
        { it: "Correggi tutto con salvataggio automatico", en: "Edit everything with automatic saving" },
        { it: "Checklist guidata fino al go-live", en: "A guided checklist all the way to go-live" },
      ] },
    ],
    roi: { title: { it: "Quanto vale rispondere subito?", en: "What is an immediate answer worth?" }, note: { it: "Stima indicativa basata sui valori che inserisci.", en: "Indicative estimate based on the values you enter." } },
    service: { title: { it: "Configurato per te da MDAC", en: "Configured for you by MDAC" }, points: [
      { it: "Impostazione del profilo struttura", en: "Property profile setup" },
      { it: "Tono di voce su misura", en: "A tailored tone of voice" },
      { it: "Cartoncini QR pronti da stampare", en: "Print-ready QR cards" },
      { it: "Formazione dello staff", en: "Staff training" },
    ] },
    demoUrl: DEMO_URL,
    integrations: [{ it: "Sito web", en: "Website" }, { it: "Pagina QR in camera", en: "In-room QR page" }, { it: "Instagram", en: "Instagram" }, { it: "Email", en: "Email" }, { it: "Export CSV", en: "CSV export" }],
    integrationIntro: { it: "Funziona con il tuo booking engine: se accetta date e ospiti nel link li precompiliamo, altrimenti portiamo l'ospite dritto alla tua pagina di prenotazione.", en: "It works with your booking engine: if its link accepts dates and guest details, we pre-fill them; otherwise, we take guests straight to your booking page." },
    faqs: [
      { question: { it: "Serve un'integrazione con il mio booking engine?", en: "Do I need an integration with my booking engine?" }, answer: { it: "No, basta il link di prenotazione.", en: "No, your booking link is all we need." } },
      { question: { it: "Mi aiuta ad aumentare le prenotazioni dirette?", en: "Does it help me increase direct bookings?" }, answer: { it: "Sì. Ogni preventivo porta l'ospite sul tuo booking engine, senza commissioni.", en: "Yes. Every quote guides the guest to your booking engine, with no commissions." } },
      { question: { it: "Come funzionano i preventivi in chat?", en: "How do quotes in chat work?" }, answer: { it: "Il concierge raccoglie date e numero di ospiti, suggerisce la camera più adatta e prepara il passaggio al booking engine.", en: "The concierge collects dates and guest numbers, suggests the best room and prepares the handoff to your booking engine." } },
      { question: { it: "Il bot inventa prezzi o disponibilità?", en: "Does the bot invent prices or availability?" }, answer: { it: "No. Indica i prezzi solo come «a partire da» e invita sempre l'ospite a verificare la disponibilità.", en: "No. It only presents prices as “starting from” and always asks guests to verify availability." } },
      { question: { it: "Risponde agli ospiti stranieri?", en: "Does it answer international guests?" }, answer: { it: "Sì. Riconosce la lingua dell'ospite e risponde automaticamente nella stessa lingua.", en: "Yes. It detects the guest's language and automatically replies in that language." } },
      { question: { it: "Può fare da concierge sul territorio?", en: "Can it act as a local concierge?" }, answer: { it: "Sì, con la guida locale che compili tu: ristoranti, spiagge, trasporti e luoghi da scoprire.", en: "Yes, using the local guide you create: restaurants, beaches, transport and places to discover." } },
      { question: { it: "Come capisco se sta portando risultati?", en: "How do I know whether it is delivering results?" }, answer: { it: "La pagina Risultati mostra conversazioni, preventivi, clic verso il booking engine e richieste fuori orario.", en: "The Results page shows conversations, quotes, clicks to your booking engine and after-hours requests." } },
      { question: { it: "I dati degli ospiti sono miei?", en: "Do I own my guests’ data?" }, answer: { it: "Sì, li vedi nella dashboard e li esporti in CSV.", en: "Yes. You can view them in your dashboard and export them as CSV." } },
    ],
    seo: {
      title: { it: "Genius Concierge Hotel | Più prenotazioni dirette, reception 24/7", en: "Genius Hotel Concierge | More direct bookings, 24/7 reception" },
      description: { it: "Il concierge AI per hotel risponde in ogni lingua, prepara preventivi, porta gli ospiti sul booking engine e gestisce le richieste dalle camere.", en: "The AI hotel concierge answers in every language, prepares quotes, guides guests to your booking engine and handles in-room requests." },
    },
    finalCta: { it: "La tua reception, sempre aperta.", en: "Your front desk, always open." },
  },
];

export const getVertical = (id: string | undefined) => verticals.find((vertical) => vertical.id === id);
