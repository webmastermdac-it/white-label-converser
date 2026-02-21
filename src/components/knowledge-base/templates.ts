import { KBSections } from "./types";

export interface IndustryTemplate {
  id: string;
  icon: string;
  name: string;
  description: string;
  sections: KBSections;
}

export const industryTemplates: IndustryTemplate[] = [
  {
    id: "restaurant",
    icon: "🍕",
    name: "Ristorante / Pizzeria",
    description: "Menu, orari, prenotazioni, consegne, allergeni",
    sections: {
      about_us:
        "Siamo un ristorante/pizzeria che offre cucina tradizionale italiana con ingredienti freschi e di qualità. La nostra passione per la cucina ci guida dal [anno di fondazione].",
      products_services:
        "- Menu alla carta: antipasti, primi, secondi, pizze, dessert\n- Menu del giorno (pranzo): €12-15\n- Servizio delivery tramite [piattaforma]\n- Catering per eventi privati\n- Menu bambini disponibile\n- Opzioni vegetariane, vegane e senza glutine",
      faqs: [
        { question: "Accettate prenotazioni?", answer: "Sì, è possibile prenotare telefonicamente o tramite il nostro sito web. Si consiglia la prenotazione per il fine settimana." },
        { question: "Fate consegne a domicilio?", answer: "Sì, consegniamo nella zona circostante entro un raggio di 5km. Ordine minimo €15." },
        { question: "Avete opzioni per allergici?", answer: "Sì, il nostro menu include indicazioni sugli allergeni. Informate il personale di eventuali allergie." },
      ],
      tone_of_voice:
        "Tono amichevole e accogliente, come un oste che ti riceve nel suo locale. Usa espressioni calorose. Puoi usare emoji alimentari 🍕🍝.",
      forbidden_topics:
        "Prezzi dei competitor, ricette segrete, opinioni politiche, recensioni negative di altri ristoranti.",
      contacts_hours:
        "Orari: Mar-Dom 12:00-15:00 e 19:00-23:00. Lunedì chiuso.\nTelefono: [numero]\nIndirizzo: [indirizzo]",
    },
  },
  {
    id: "dentist",
    icon: "🦷",
    name: "Studio Dentistico",
    description: "Trattamenti, prenotazioni, assicurazioni, emergenze",
    sections: {
      about_us:
        "Il nostro studio dentistico offre cure odontoiatriche di alta qualità in un ambiente confortevole e moderno. Il nostro team di professionisti è al vostro servizio per ogni esigenza.",
      products_services:
        "- Igiene dentale e prevenzione\n- Odontoiatria conservativa\n- Implantologia\n- Ortodonzia (anche invisibile)\n- Sbiancamento dentale\n- Chirurgia orale\n- Odontoiatria pediatrica\n- Prima visita gratuita",
      faqs: [
        { question: "Come posso prenotare un appuntamento?", answer: "Può prenotare chiamando il nostro studio o compilando il form sul sito. La ricontatteremo entro 24 ore." },
        { question: "Accettate assicurazioni?", answer: "Sì, lavoriamo con le principali assicurazioni sanitarie. Contattaci per verificare la tua copertura." },
        { question: "Cosa fare in caso di emergenza?", answer: "Per emergenze durante l'orario di apertura, chiami il nostro studio. Fuori orario, si rechi al pronto soccorso più vicino." },
      ],
      tone_of_voice:
        "Tono professionale ma rassicurante. Usa un linguaggio chiaro e accessibile, evitando termini troppo tecnici. L'obiettivo è mettere a proprio agio il paziente.",
      forbidden_topics:
        "Non fornire diagnosi mediche. Non dare consigli terapeutici specifici. Non commentare tariffe di altri studi. Non fornire informazioni su farmaci da prescrizione.",
      contacts_hours:
        "Orari: Lun-Ven 9:00-19:00, Sab 9:00-13:00\nTelefono: [numero]\nEmail: [email]\nIndirizzo: [indirizzo]",
    },
  },
  {
    id: "law-firm",
    icon: "⚖️",
    name: "Studio Legale",
    description: "Aree di pratica, consulenze, riservatezza, tariffe",
    sections: {
      about_us:
        "Il nostro studio legale offre assistenza qualificata in diverse aree del diritto. Con anni di esperienza, garantiamo professionalità, riservatezza e dedizione ai nostri clienti.",
      products_services:
        "- Diritto civile e commerciale\n- Diritto del lavoro\n- Diritto di famiglia\n- Diritto penale\n- Recupero crediti\n- Consulenza contrattuale\n- Prima consulenza conoscitiva",
      faqs: [
        { question: "Come funziona la prima consulenza?", answer: "La prima consulenza serve a valutare il caso. Dura circa 30 minuti e permette di definire la strategia migliore." },
        { question: "Come vengono gestiti i miei dati?", answer: "Tutti i dati sono trattati con la massima riservatezza nel rispetto del GDPR e del segreto professionale." },
        { question: "Quali sono le vostre tariffe?", answer: "Le tariffe variano in base alla complessità del caso. Forniamo sempre un preventivo trasparente prima di iniziare." },
      ],
      tone_of_voice:
        "Tono formale e professionale. Linguaggio preciso ma comprensibile. Trasmettere competenza e affidabilità. Non usare emoji.",
      forbidden_topics:
        "Non fornire consulenza legale specifica tramite chatbot. Non commentare casi in corso. Non discutere di casi di altri clienti. Non esprimere opinioni su sentenze o giudici.",
      contacts_hours:
        "Orari: Lun-Ven 9:00-18:00, su appuntamento\nTelefono: [numero]\nEmail: [email]\nPEC: [pec]",
    },
  },
  {
    id: "gym",
    icon: "🏋️",
    name: "Palestra / Centro Fitness",
    description: "Abbonamenti, corsi, trainer, prova gratuita",
    sections: {
      about_us:
        "Il nostro centro fitness offre un ambiente motivante e attrezzature all'avanguardia per aiutarti a raggiungere i tuoi obiettivi. Personal trainer qualificati e corsi per ogni livello.",
      products_services:
        "- Abbonamento mensile / trimestrale / annuale\n- Sala pesi e cardio\n- Corsi di gruppo (yoga, pilates, spinning, functional training)\n- Personal training\n- Prova gratuita di 3 giorni\n- Area wellness (sauna, bagno turco)",
      faqs: [
        { question: "Posso provare la palestra prima di abbonarmi?", answer: "Certo! Offriamo 3 giorni di prova gratuita. Vieni con un documento d'identità e abbigliamento sportivo." },
        { question: "Devo prenotare per i corsi?", answer: "Sì, la prenotazione è consigliata tramite la nostra app o alla reception. I posti sono limitati." },
        { question: "Posso congelare l'abbonamento?", answer: "Sì, è possibile congelare l'abbonamento per un massimo di 30 giorni all'anno con certificato medico." },
      ],
      tone_of_voice:
        "Tono energico e motivazionale! Incoraggia le persone a provare e a non arrendersi. Usa emoji sportivi 💪🏋️‍♀️🔥.",
      forbidden_topics:
        "Non dare consigli medici o nutrizionali specifici. Non commentare il fisico delle persone. Non paragonare con altre palestre.",
      contacts_hours:
        "Orari: Lun-Ven 6:00-22:00, Sab 8:00-20:00, Dom 9:00-14:00\nTelefono: [numero]\nIndirizzo: [indirizzo]",
    },
  },
  {
    id: "real-estate",
    icon: "🏠",
    name: "Agenzia Immobiliare",
    description: "Compravendita, affitti, valutazioni, documentazione",
    sections: {
      about_us:
        "La nostra agenzia immobiliare opera sul territorio da anni, offrendo servizi di compravendita, affitto e valutazione immobiliare con professionalità e trasparenza.",
      products_services:
        "- Vendita immobili residenziali e commerciali\n- Affitti a lungo termine e transitori\n- Valutazioni immobiliari gratuite\n- Consulenza mutui e finanziamenti\n- Gestione documentazione\n- Home staging",
      faqs: [
        { question: "Come posso valutare il mio immobile?", answer: "Offriamo valutazioni gratuite. Un nostro agente visiterà l'immobile e fornirà una stima basata sul mercato attuale." },
        { question: "Quali documenti servono per vendere?", answer: "Servono: atto di proprietà, APE, planimetria catastale, visura catastale, certificato di agibilità." },
        { question: "Quanto costa il servizio?", answer: "La provvigione è del [X]% sul prezzo di vendita. Per gli affitti, il costo è pari a una mensilità." },
      ],
      tone_of_voice:
        "Tono professionale ma cordiale. Dimostrare competenza del mercato locale. Essere disponibili e pazienti con le domande.",
      forbidden_topics:
        "Non fornire valutazioni precise senza visita. Non commentare prezzi di agenzie concorrenti. Non garantire tempi di vendita specifici.",
      contacts_hours:
        "Orari: Lun-Ven 9:00-13:00 e 15:00-19:00, Sab 9:00-12:00\nTelefono: [numero]\nEmail: [email]",
    },
  },
  {
    id: "web-agency",
    icon: "💻",
    name: "Agenzia Web / Marketing",
    description: "Servizi digitali, processo, portfolio, contatti",
    sections: {
      about_us:
        "Siamo un'agenzia digitale specializzata in sviluppo web, marketing digitale e branding. Aiutiamo le aziende a crescere online con soluzioni su misura e strategie data-driven.",
      products_services:
        "- Sviluppo siti web e e-commerce\n- SEO e SEM (Google Ads)\n- Social media marketing\n- Brand identity e grafica\n- Chatbot e automazione (con Genius Chatbot Builder!)\n- Consulenza digitale strategica\n- Pacchetti mensili da €500/mese",
      faqs: [
        { question: "Quanto costa un sito web?", answer: "I prezzi partono da €1.500 per un sito vetrina. Per un e-commerce, da €3.000. Ogni progetto viene preventivato su misura." },
        { question: "Quanto tempo serve per un sito?", answer: "Un sito vetrina richiede 3-4 settimane. Un e-commerce 6-8 settimane. Dipende dalla complessità del progetto." },
        { question: "Offrite assistenza post-lancio?", answer: "Sì, tutti i nostri piani includono supporto tecnico. Offriamo anche piani di manutenzione mensile." },
      ],
      tone_of_voice:
        "Tono dinamico e moderno. Dimostra competenza tecnica ma spiega in modo semplice. Usa termini del settore quando appropriato. Emoji ok con moderazione 🚀.",
      forbidden_topics:
        "Non condividere dettagli tecnici interni. Non parlare di clienti specifici senza autorizzazione. Non commentare lavori della concorrenza.",
      contacts_hours:
        "Orari: Lun-Ven 9:00-18:00\nEmail: [email]\nTelefono: [numero]\nSede: [indirizzo]",
    },
  },
  {
    id: "ecommerce",
    icon: "🛒",
    name: "E-Commerce",
    description: "Spedizioni, resi, pagamenti, supporto prodotti",
    sections: {
      about_us:
        "Il nostro e-commerce offre prodotti di qualità con spedizioni rapide e un servizio clienti dedicato. La soddisfazione del cliente è la nostra priorità.",
      products_services:
        "- Catalogo prodotti con descrizioni dettagliate\n- Spedizione gratuita sopra €50\n- Consegna in 2-5 giorni lavorativi\n- Pagamento con carta, PayPal, bonifico\n- Reso gratuito entro 30 giorni",
      faqs: [
        { question: "Come posso tracciare il mio ordine?", answer: "Riceverai un'email con il codice di tracciamento non appena l'ordine viene spedito. Puoi seguire lo stato dalla tua area personale." },
        { question: "Come funzionano i resi?", answer: "Hai 30 giorni per restituire il prodotto. Contattaci per avviare la procedura, ti invieremo un'etichetta di reso prepagata." },
        { question: "Quali metodi di pagamento accettate?", answer: "Accettiamo carte di credito/debito, PayPal, Apple Pay, Google Pay e bonifico bancario." },
      ],
      tone_of_voice:
        "Tono cordiale e orientato alla soluzione. Rispondi velocemente e offri alternative quando possibile. Usa emoji con moderazione 📦✨.",
      forbidden_topics:
        "Non condividere informazioni su fornitori. Non promettere sconti non autorizzati. Non discutere di prezzi dei competitor.",
      contacts_hours:
        "Assistenza: Lun-Ven 9:00-18:00\nEmail: [email]\nChat disponibile H24 tramite bot",
    },
  },
  {
    id: "medical",
    icon: "🏥",
    name: "Studio Medico / Clinica",
    description: "Specializzazioni, prenotazioni, assicurazioni, limiti del bot",
    sections: {
      about_us:
        "Il nostro studio medico / clinica offre cure specialistiche di eccellenza in un ambiente accogliente e moderno. Un team di medici esperti al servizio della tua salute.",
      products_services:
        "- Visite specialistiche\n- Diagnostica e analisi\n- Check-up completi\n- Medicina preventiva\n- Telemedicina\n- Convenzioni con assicurazioni sanitarie",
      faqs: [
        { question: "Come prenoto una visita?", answer: "Puoi prenotare chiamando il CUP, tramite il sito web o contattandoci su WhatsApp. Ti confermeremo data e ora." },
        { question: "Accettate assicurazioni sanitarie?", answer: "Sì, siamo convenzionati con le principali assicurazioni. Contattaci per verificare la tua copertura." },
        { question: "Quanto dura una visita?", answer: "La durata varia in base alla specialità. In media, una prima visita dura 30-45 minuti." },
      ],
      tone_of_voice:
        "Tono professionale, empatico e rassicurante. Usa un linguaggio chiaro e mai allarmistico. Mostra comprensione per le preoccupazioni del paziente.",
      forbidden_topics:
        "⚠️ IMPORTANTE: Il bot NON deve MAI fornire diagnosi mediche, prescrivere farmaci, interpretare esami, o dare consigli terapeutici. Deve sempre rimandare al medico per queste questioni.",
      contacts_hours:
        "Orari: Lun-Ven 8:00-20:00, Sab 8:00-13:00\nCUP: [numero]\nEmail: [email]\nEmergenze: chiamare il 118",
    },
  },
];
