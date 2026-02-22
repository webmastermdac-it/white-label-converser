import { KBSections } from "./types";

export interface IndustryTemplate {
  id: string;
  icon: string;
  name: { it: string; en: string };
  description: { it: string; en: string };
  sections: { it: KBSections; en: KBSections };
}

export const industryTemplates: IndustryTemplate[] = [
  {
    id: "restaurant",
    icon: "🍕",
    name: { it: "Ristorante / Pizzeria", en: "Restaurant / Pizzeria" },
    description: { it: "Menu, orari, prenotazioni, consegne, allergeni", en: "Menu, hours, reservations, delivery, allergens" },
    sections: {
      it: {
        about_us: "Siamo un ristorante/pizzeria che offre cucina tradizionale italiana con ingredienti freschi e di qualità. La nostra passione per la cucina ci guida dal [anno di fondazione].",
        products_services: "- Menu alla carta: antipasti, primi, secondi, pizze, dessert\n- Menu del giorno (pranzo): €12-15\n- Servizio delivery tramite [piattaforma]\n- Catering per eventi privati\n- Menu bambini disponibile\n- Opzioni vegetariane, vegane e senza glutine",
        faqs: [
          { question: "Accettate prenotazioni?", answer: "Sì, è possibile prenotare telefonicamente o tramite il nostro sito web. Si consiglia la prenotazione per il fine settimana." },
          { question: "Fate consegne a domicilio?", answer: "Sì, consegniamo nella zona circostante entro un raggio di 5km. Ordine minimo €15." },
          { question: "Avete opzioni per allergici?", answer: "Sì, il nostro menu include indicazioni sugli allergeni. Informate il personale di eventuali allergie." },
        ],
        tone_of_voice: "Tono amichevole e accogliente, come un oste che ti riceve nel suo locale. Usa espressioni calorose. Puoi usare emoji alimentari 🍕🍝.",
        forbidden_topics: "Prezzi dei competitor, ricette segrete, opinioni politiche, recensioni negative di altri ristoranti.",
        contacts_hours: "Orari: Mar-Dom 12:00-15:00 e 19:00-23:00. Lunedì chiuso.\nTelefono: [numero]\nIndirizzo: [indirizzo]",
      },
      en: {
        about_us: "We are a restaurant/pizzeria offering traditional Italian cuisine with fresh, quality ingredients. Our passion for cooking has guided us since [founding year].",
        products_services: "- À la carte menu: appetizers, pasta, mains, pizzas, desserts\n- Daily lunch menu: €12-15\n- Delivery service via [platform]\n- Catering for private events\n- Kids menu available\n- Vegetarian, vegan, and gluten-free options",
        faqs: [
          { question: "Do you accept reservations?", answer: "Yes, you can book by phone or through our website. Reservations are recommended for weekends." },
          { question: "Do you offer home delivery?", answer: "Yes, we deliver within a 5km radius. Minimum order €15." },
          { question: "Do you have options for people with allergies?", answer: "Yes, our menu includes allergen information. Please inform our staff of any allergies." },
        ],
        tone_of_voice: "Friendly and welcoming tone, like a host receiving you in their restaurant. Use warm expressions. You can use food emojis 🍕🍝.",
        forbidden_topics: "Competitor prices, secret recipes, political opinions, negative reviews of other restaurants.",
        contacts_hours: "Hours: Tue-Sun 12:00-15:00 and 19:00-23:00. Closed on Mondays.\nPhone: [number]\nAddress: [address]",
      },
    },
  },
  {
    id: "dentist",
    icon: "🦷",
    name: { it: "Studio Dentistico", en: "Dental Practice" },
    description: { it: "Trattamenti, prenotazioni, assicurazioni, emergenze", en: "Treatments, appointments, insurance, emergencies" },
    sections: {
      it: {
        about_us: "Il nostro studio dentistico offre cure odontoiatriche di alta qualità in un ambiente confortevole e moderno. Il nostro team di professionisti è al vostro servizio per ogni esigenza.",
        products_services: "- Igiene dentale e prevenzione\n- Odontoiatria conservativa\n- Implantologia\n- Ortodonzia (anche invisibile)\n- Sbiancamento dentale\n- Chirurgia orale\n- Odontoiatria pediatrica\n- Prima visita gratuita",
        faqs: [
          { question: "Come posso prenotare un appuntamento?", answer: "Può prenotare chiamando il nostro studio o compilando il form sul sito. La ricontatteremo entro 24 ore." },
          { question: "Accettate assicurazioni?", answer: "Sì, lavoriamo con le principali assicurazioni sanitarie. Contattaci per verificare la tua copertura." },
          { question: "Cosa fare in caso di emergenza?", answer: "Per emergenze durante l'orario di apertura, chiami il nostro studio. Fuori orario, si rechi al pronto soccorso più vicino." },
        ],
        tone_of_voice: "Tono professionale ma rassicurante. Usa un linguaggio chiaro e accessibile, evitando termini troppo tecnici. L'obiettivo è mettere a proprio agio il paziente.",
        forbidden_topics: "Non fornire diagnosi mediche. Non dare consigli terapeutici specifici. Non commentare tariffe di altri studi. Non fornire informazioni su farmaci da prescrizione.",
        contacts_hours: "Orari: Lun-Ven 9:00-19:00, Sab 9:00-13:00\nTelefono: [numero]\nEmail: [email]\nIndirizzo: [indirizzo]",
      },
      en: {
        about_us: "Our dental practice offers high-quality dental care in a comfortable and modern environment. Our team of professionals is at your service for every need.",
        products_services: "- Dental hygiene and prevention\n- Conservative dentistry\n- Implantology\n- Orthodontics (including invisible aligners)\n- Teeth whitening\n- Oral surgery\n- Pediatric dentistry\n- Free first visit",
        faqs: [
          { question: "How can I book an appointment?", answer: "You can book by calling our office or filling out the form on our website. We will get back to you within 24 hours." },
          { question: "Do you accept insurance?", answer: "Yes, we work with major health insurance providers. Contact us to verify your coverage." },
          { question: "What to do in case of emergency?", answer: "For emergencies during office hours, call our practice. After hours, go to the nearest emergency room." },
        ],
        tone_of_voice: "Professional but reassuring tone. Use clear, accessible language, avoiding overly technical terms. The goal is to put the patient at ease.",
        forbidden_topics: "Do not provide medical diagnoses. Do not give specific therapeutic advice. Do not comment on other practices' fees. Do not provide information on prescription drugs.",
        contacts_hours: "Hours: Mon-Fri 9:00-19:00, Sat 9:00-13:00\nPhone: [number]\nEmail: [email]\nAddress: [address]",
      },
    },
  },
  {
    id: "law-firm",
    icon: "⚖️",
    name: { it: "Studio Legale", en: "Law Firm" },
    description: { it: "Aree di pratica, consulenze, riservatezza, tariffe", en: "Practice areas, consultations, confidentiality, fees" },
    sections: {
      it: {
        about_us: "Il nostro studio legale offre assistenza qualificata in diverse aree del diritto. Con anni di esperienza, garantiamo professionalità, riservatezza e dedizione ai nostri clienti.",
        products_services: "- Diritto civile e commerciale\n- Diritto del lavoro\n- Diritto di famiglia\n- Diritto penale\n- Recupero crediti\n- Consulenza contrattuale\n- Prima consulenza conoscitiva",
        faqs: [
          { question: "Come funziona la prima consulenza?", answer: "La prima consulenza serve a valutare il caso. Dura circa 30 minuti e permette di definire la strategia migliore." },
          { question: "Come vengono gestiti i miei dati?", answer: "Tutti i dati sono trattati con la massima riservatezza nel rispetto del GDPR e del segreto professionale." },
          { question: "Quali sono le vostre tariffe?", answer: "Le tariffe variano in base alla complessità del caso. Forniamo sempre un preventivo trasparente prima di iniziare." },
        ],
        tone_of_voice: "Tono formale e professionale. Linguaggio preciso ma comprensibile. Trasmettere competenza e affidabilità. Non usare emoji.",
        forbidden_topics: "Non fornire consulenza legale specifica tramite chatbot. Non commentare casi in corso. Non discutere di casi di altri clienti. Non esprimere opinioni su sentenze o giudici.",
        contacts_hours: "Orari: Lun-Ven 9:00-18:00, su appuntamento\nTelefono: [numero]\nEmail: [email]\nPEC: [pec]",
      },
      en: {
        about_us: "Our law firm offers qualified assistance in various areas of law. With years of experience, we guarantee professionalism, confidentiality, and dedication to our clients.",
        products_services: "- Civil and commercial law\n- Employment law\n- Family law\n- Criminal law\n- Debt recovery\n- Contract advisory\n- Free initial consultation",
        faqs: [
          { question: "How does the first consultation work?", answer: "The first consultation is to assess the case. It lasts about 30 minutes and helps define the best strategy." },
          { question: "How is my data handled?", answer: "All data is treated with the utmost confidentiality in compliance with GDPR and professional secrecy." },
          { question: "What are your fees?", answer: "Fees vary depending on the complexity of the case. We always provide a transparent quote before starting." },
        ],
        tone_of_voice: "Formal and professional tone. Precise but understandable language. Convey competence and reliability. Do not use emojis.",
        forbidden_topics: "Do not provide specific legal advice via chatbot. Do not comment on ongoing cases. Do not discuss other clients' cases. Do not express opinions on rulings or judges.",
        contacts_hours: "Hours: Mon-Fri 9:00-18:00, by appointment\nPhone: [number]\nEmail: [email]",
      },
    },
  },
  {
    id: "gym",
    icon: "🏋️",
    name: { it: "Palestra / Centro Fitness", en: "Gym / Fitness Center" },
    description: { it: "Abbonamenti, corsi, trainer, prova gratuita", en: "Memberships, classes, trainers, free trial" },
    sections: {
      it: {
        about_us: "Il nostro centro fitness offre un ambiente motivante e attrezzature all'avanguardia per aiutarti a raggiungere i tuoi obiettivi. Personal trainer qualificati e corsi per ogni livello.",
        products_services: "- Abbonamento mensile / trimestrale / annuale\n- Sala pesi e cardio\n- Corsi di gruppo (yoga, pilates, spinning, functional training)\n- Personal training\n- Prova gratuita di 3 giorni\n- Area wellness (sauna, bagno turco)",
        faqs: [
          { question: "Posso provare la palestra prima di abbonarmi?", answer: "Certo! Offriamo 3 giorni di prova gratuita. Vieni con un documento d'identità e abbigliamento sportivo." },
          { question: "Devo prenotare per i corsi?", answer: "Sì, la prenotazione è consigliata tramite la nostra app o alla reception. I posti sono limitati." },
          { question: "Posso congelare l'abbonamento?", answer: "Sì, è possibile congelare l'abbonamento per un massimo di 30 giorni all'anno con certificato medico." },
        ],
        tone_of_voice: "Tono energico e motivazionale! Incoraggia le persone a provare e a non arrendersi. Usa emoji sportivi 💪🏋️‍♀️🔥.",
        forbidden_topics: "Non dare consigli medici o nutrizionali specifici. Non commentare il fisico delle persone. Non paragonare con altre palestre.",
        contacts_hours: "Orari: Lun-Ven 6:00-22:00, Sab 8:00-20:00, Dom 9:00-14:00\nTelefono: [numero]\nIndirizzo: [indirizzo]",
      },
      en: {
        about_us: "Our fitness center offers a motivating environment and state-of-the-art equipment to help you reach your goals. Qualified personal trainers and classes for every level.",
        products_services: "- Monthly / quarterly / annual membership\n- Weights and cardio room\n- Group classes (yoga, pilates, spinning, functional training)\n- Personal training\n- Free 3-day trial\n- Wellness area (sauna, steam room)",
        faqs: [
          { question: "Can I try the gym before signing up?", answer: "Of course! We offer a free 3-day trial. Bring a valid ID and sportswear." },
          { question: "Do I need to book classes?", answer: "Yes, booking is recommended through our app or at the reception. Spots are limited." },
          { question: "Can I freeze my membership?", answer: "Yes, you can freeze your membership for up to 30 days per year with a medical certificate." },
        ],
        tone_of_voice: "Energetic and motivational tone! Encourage people to try and never give up. Use sports emojis 💪🏋️‍♀️🔥.",
        forbidden_topics: "Do not give specific medical or nutritional advice. Do not comment on people's physique. Do not compare with other gyms.",
        contacts_hours: "Hours: Mon-Fri 6:00-22:00, Sat 8:00-20:00, Sun 9:00-14:00\nPhone: [number]\nAddress: [address]",
      },
    },
  },
  {
    id: "real-estate",
    icon: "🏠",
    name: { it: "Agenzia Immobiliare", en: "Real Estate Agency" },
    description: { it: "Compravendita, affitti, valutazioni, documentazione", en: "Sales, rentals, valuations, documentation" },
    sections: {
      it: {
        about_us: "La nostra agenzia immobiliare opera sul territorio da anni, offrendo servizi di compravendita, affitto e valutazione immobiliare con professionalità e trasparenza.",
        products_services: "- Vendita immobili residenziali e commerciali\n- Affitti a lungo termine e transitori\n- Valutazioni immobiliari gratuite\n- Consulenza mutui e finanziamenti\n- Gestione documentazione\n- Home staging",
        faqs: [
          { question: "Come posso valutare il mio immobile?", answer: "Offriamo valutazioni gratuite. Un nostro agente visiterà l'immobile e fornirà una stima basata sul mercato attuale." },
          { question: "Quali documenti servono per vendere?", answer: "Servono: atto di proprietà, APE, planimetria catastale, visura catastale, certificato di agibilità." },
          { question: "Quanto costa il servizio?", answer: "La provvigione è del [X]% sul prezzo di vendita. Per gli affitti, il costo è pari a una mensilità." },
        ],
        tone_of_voice: "Tono professionale ma cordiale. Dimostrare competenza del mercato locale. Essere disponibili e pazienti con le domande.",
        forbidden_topics: "Non fornire valutazioni precise senza visita. Non commentare prezzi di agenzie concorrenti. Non garantire tempi di vendita specifici.",
        contacts_hours: "Orari: Lun-Ven 9:00-13:00 e 15:00-19:00, Sab 9:00-12:00\nTelefono: [numero]\nEmail: [email]",
      },
      en: {
        about_us: "Our real estate agency has been operating in the area for years, offering sales, rental, and property valuation services with professionalism and transparency.",
        products_services: "- Residential and commercial property sales\n- Long-term and short-term rentals\n- Free property valuations\n- Mortgage and financing consultancy\n- Documentation management\n- Home staging",
        faqs: [
          { question: "How can I get my property valued?", answer: "We offer free valuations. One of our agents will visit the property and provide an estimate based on the current market." },
          { question: "What documents are needed to sell?", answer: "You need: deed of ownership, energy performance certificate, cadastral plan, cadastral survey, habitability certificate." },
          { question: "How much does the service cost?", answer: "The commission is [X]% of the sale price. For rentals, the fee is equal to one month's rent." },
        ],
        tone_of_voice: "Professional but friendly tone. Demonstrate local market expertise. Be available and patient with questions.",
        forbidden_topics: "Do not provide precise valuations without a visit. Do not comment on competitor agency prices. Do not guarantee specific sale timelines.",
        contacts_hours: "Hours: Mon-Fri 9:00-13:00 and 15:00-19:00, Sat 9:00-12:00\nPhone: [number]\nEmail: [email]",
      },
    },
  },
  {
    id: "web-agency",
    icon: "💻",
    name: { it: "Agenzia Web / Marketing", en: "Web / Marketing Agency" },
    description: { it: "Servizi digitali, processo, portfolio, contatti", en: "Digital services, process, portfolio, contacts" },
    sections: {
      it: {
        about_us: "Siamo un'agenzia digitale specializzata in sviluppo web, marketing digitale e branding. Aiutiamo le aziende a crescere online con soluzioni su misura e strategie data-driven.",
        products_services: "- Sviluppo siti web e e-commerce\n- SEO e SEM (Google Ads)\n- Social media marketing\n- Brand identity e grafica\n- Chatbot e automazione (con Genius Chatbot Builder!)\n- Consulenza digitale strategica\n- Pacchetti mensili da €500/mese",
        faqs: [
          { question: "Quanto costa un sito web?", answer: "I prezzi partono da €1.500 per un sito vetrina. Per un e-commerce, da €3.000. Ogni progetto viene preventivato su misura." },
          { question: "Quanto tempo serve per un sito?", answer: "Un sito vetrina richiede 3-4 settimane. Un e-commerce 6-8 settimane. Dipende dalla complessità del progetto." },
          { question: "Offrite assistenza post-lancio?", answer: "Sì, tutti i nostri piani includono supporto tecnico. Offriamo anche piani di manutenzione mensile." },
        ],
        tone_of_voice: "Tono dinamico e moderno. Dimostra competenza tecnica ma spiega in modo semplice. Usa termini del settore quando appropriato. Emoji ok con moderazione 🚀.",
        forbidden_topics: "Non condividere dettagli tecnici interni. Non parlare di clienti specifici senza autorizzazione. Non commentare lavori della concorrenza.",
        contacts_hours: "Orari: Lun-Ven 9:00-18:00\nEmail: [email]\nTelefono: [numero]\nSede: [indirizzo]",
      },
      en: {
        about_us: "We are a digital agency specializing in web development, digital marketing, and branding. We help businesses grow online with custom solutions and data-driven strategies.",
        products_services: "- Website and e-commerce development\n- SEO and SEM (Google Ads)\n- Social media marketing\n- Brand identity and graphic design\n- Chatbot and automation (with Genius Chatbot Builder!)\n- Strategic digital consulting\n- Monthly packages from €500/month",
        faqs: [
          { question: "How much does a website cost?", answer: "Prices start at €1,500 for a showcase website. For an e-commerce site, from €3,000. Every project is quoted on a custom basis." },
          { question: "How long does it take to build a site?", answer: "A showcase site takes 3-4 weeks. An e-commerce site takes 6-8 weeks. It depends on project complexity." },
          { question: "Do you offer post-launch support?", answer: "Yes, all our plans include technical support. We also offer monthly maintenance plans." },
        ],
        tone_of_voice: "Dynamic and modern tone. Demonstrate technical expertise but explain simply. Use industry terms when appropriate. Emojis ok in moderation 🚀.",
        forbidden_topics: "Do not share internal technical details. Do not discuss specific clients without authorization. Do not comment on competitors' work.",
        contacts_hours: "Hours: Mon-Fri 9:00-18:00\nEmail: [email]\nPhone: [number]\nOffice: [address]",
      },
    },
  },
  {
    id: "ecommerce",
    icon: "🛒",
    name: { it: "E-Commerce", en: "E-Commerce" },
    description: { it: "Spedizioni, resi, pagamenti, supporto prodotti", en: "Shipping, returns, payments, product support" },
    sections: {
      it: {
        about_us: "Il nostro e-commerce offre prodotti di qualità con spedizioni rapide e un servizio clienti dedicato. La soddisfazione del cliente è la nostra priorità.",
        products_services: "- Catalogo prodotti con descrizioni dettagliate\n- Spedizione gratuita sopra €50\n- Consegna in 2-5 giorni lavorativi\n- Pagamento con carta, PayPal, bonifico\n- Reso gratuito entro 30 giorni",
        faqs: [
          { question: "Come posso tracciare il mio ordine?", answer: "Riceverai un'email con il codice di tracciamento non appena l'ordine viene spedito. Puoi seguire lo stato dalla tua area personale." },
          { question: "Come funzionano i resi?", answer: "Hai 30 giorni per restituire il prodotto. Contattaci per avviare la procedura, ti invieremo un'etichetta di reso prepagata." },
          { question: "Quali metodi di pagamento accettate?", answer: "Accettiamo carte di credito/debito, PayPal, Apple Pay, Google Pay e bonifico bancario." },
        ],
        tone_of_voice: "Tono cordiale e orientato alla soluzione. Rispondi velocemente e offri alternative quando possibile. Usa emoji con moderazione 📦✨.",
        forbidden_topics: "Non condividere informazioni su fornitori. Non promettere sconti non autorizzati. Non discutere di prezzi dei competitor.",
        contacts_hours: "Assistenza: Lun-Ven 9:00-18:00\nEmail: [email]\nChat disponibile H24 tramite bot",
      },
      en: {
        about_us: "Our e-commerce offers quality products with fast shipping and a dedicated customer service team. Customer satisfaction is our top priority.",
        products_services: "- Product catalog with detailed descriptions\n- Free shipping over €50\n- Delivery in 2-5 business days\n- Payment by card, PayPal, bank transfer\n- Free returns within 30 days",
        faqs: [
          { question: "How can I track my order?", answer: "You will receive an email with the tracking code as soon as the order is shipped. You can track the status from your personal area." },
          { question: "How do returns work?", answer: "You have 30 days to return the product. Contact us to start the process, and we will send you a prepaid return label." },
          { question: "What payment methods do you accept?", answer: "We accept credit/debit cards, PayPal, Apple Pay, Google Pay, and bank transfer." },
        ],
        tone_of_voice: "Friendly and solution-oriented tone. Reply quickly and offer alternatives when possible. Use emojis in moderation 📦✨.",
        forbidden_topics: "Do not share supplier information. Do not promise unauthorized discounts. Do not discuss competitor prices.",
        contacts_hours: "Support: Mon-Fri 9:00-18:00\nEmail: [email]\nChat available 24/7 via bot",
      },
    },
  },
  {
    id: "medical",
    icon: "🏥",
    name: { it: "Studio Medico / Clinica", en: "Medical Practice / Clinic" },
    description: { it: "Specializzazioni, prenotazioni, assicurazioni, limiti del bot", en: "Specializations, appointments, insurance, bot limitations" },
    sections: {
      it: {
        about_us: "Il nostro studio medico / clinica offre cure specialistiche di eccellenza in un ambiente accogliente e moderno. Un team di medici esperti al servizio della tua salute.",
        products_services: "- Visite specialistiche\n- Diagnostica e analisi\n- Check-up completi\n- Medicina preventiva\n- Telemedicina\n- Convenzioni con assicurazioni sanitarie",
        faqs: [
          { question: "Come prenoto una visita?", answer: "Puoi prenotare chiamando il CUP, tramite il sito web o contattandoci su WhatsApp. Ti confermeremo data e ora." },
          { question: "Accettate assicurazioni sanitarie?", answer: "Sì, siamo convenzionati con le principali assicurazioni. Contattaci per verificare la tua copertura." },
          { question: "Quanto dura una visita?", answer: "La durata varia in base alla specialità. In media, una prima visita dura 30-45 minuti." },
        ],
        tone_of_voice: "Tono professionale, empatico e rassicurante. Usa un linguaggio chiaro e mai allarmistico. Mostra comprensione per le preoccupazioni del paziente.",
        forbidden_topics: "⚠️ IMPORTANTE: Il bot NON deve MAI fornire diagnosi mediche, prescrivere farmaci, interpretare esami, o dare consigli terapeutici. Deve sempre rimandare al medico per queste questioni.",
        contacts_hours: "Orari: Lun-Ven 8:00-20:00, Sab 8:00-13:00\nCUP: [numero]\nEmail: [email]\nEmergenze: chiamare il 118",
      },
      en: {
        about_us: "Our medical practice / clinic offers specialist care of excellence in a welcoming and modern environment. A team of expert doctors at the service of your health.",
        products_services: "- Specialist consultations\n- Diagnostics and testing\n- Comprehensive check-ups\n- Preventive medicine\n- Telemedicine\n- Partnerships with health insurance providers",
        faqs: [
          { question: "How do I book an appointment?", answer: "You can book by calling our reception, through the website, or by contacting us on WhatsApp. We will confirm the date and time." },
          { question: "Do you accept health insurance?", answer: "Yes, we are partnered with major insurance providers. Contact us to verify your coverage." },
          { question: "How long does a visit last?", answer: "Duration varies depending on the specialty. On average, a first visit lasts 30-45 minutes." },
        ],
        tone_of_voice: "Professional, empathetic, and reassuring tone. Use clear, non-alarmist language. Show understanding for the patient's concerns.",
        forbidden_topics: "⚠️ IMPORTANT: The bot must NEVER provide medical diagnoses, prescribe medication, interpret tests, or give therapeutic advice. It must always refer to the doctor for these matters.",
        contacts_hours: "Hours: Mon-Fri 8:00-20:00, Sat 8:00-13:00\nReception: [number]\nEmail: [email]\nEmergencies: call emergency services",
      },
    },
  },
];
