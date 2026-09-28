export interface TonePresetCopy {
  label: string;
  sub: string;
  fullName: string;
  text: string;
  characteristics: string;
  archetypes: string;
  example: string;
}

export interface TonePreset {
  id: string;
  it: TonePresetCopy;
  en: TonePresetCopy;
}

export const TONE_PRESETS: TonePreset[] = [
  {
    id: "istituzionale",
    it: {
      label: "Istituzionale", sub: "Preciso, autorevole, il Lei", fullName: "Istituzionale / Formale",
      text: `Tono istituzionale e formale: linguaggio preciso e autorevole, terza persona o forma di cortesia ("Lei"), evita slang e abbreviazioni. Esempio: "La ringraziamo per aver scelto i nostri servizi. La vostra sicurezza è la nostra priorità."`,
      characteristics: `Linguaggio preciso, autorevole, uso della terza persona o del "Lei". Evita slang e abbreviazioni.`,
      archetypes: "Sovrano, Saggio",
      example: "La ringraziamo per aver scelto i nostri servizi. La vostra sicurezza è la nostra priorità.",
    },
    en: {
      label: "Institutional", sub: "Precise, authoritative, formal address", fullName: "Institutional / Formal",
      text: `Institutional and formal tone: precise and authoritative language, third person or formal address, avoiding slang and abbreviations. Example: "Thank you for choosing our services. Your safety is our priority."`,
      characteristics: "Precise, authoritative language using the third person or formal address. Avoids slang and abbreviations.",
      archetypes: "Ruler, Sage",
      example: "Thank you for choosing our services. Your safety is our priority.",
    },
  },
  {
    id: "amichevole",
    it: {
      label: "Amichevole", sub: "Caldo, colloquiale, il tu", fullName: "Amichevole / Informale",
      text: `Tono amichevole e informale: caldo, accessibile, usa il "tu" e un linguaggio colloquiale ma curato. Esempio: "Ciao! Siamo felici di averti qui. Mettiti comodo, pensiamo a tutto noi."`,
      characteristics: `Caldo, accessibile, usa il "tu" e un linguaggio colloquiale ma curato.`,
      archetypes: "Uomo Comune, Innocente",
      example: "Ciao! Siamo felici di averti qui. Mettiti comodo, pensiamo a tutto noi.",
    },
    en: {
      label: "Friendly", sub: "Warm, conversational, informal", fullName: "Friendly / Informal",
      text: `Friendly and informal tone: warm, approachable, uses informal address and conversational yet polished language. Example: "Hi! We're happy to have you here. Make yourself comfortable—we'll take care of everything."`,
      characteristics: "Warm and approachable, using informal address and conversational yet polished language.",
      archetypes: "Everyman, Innocent",
      example: "Hi! We're happy to have you here. Make yourself comfortable—we'll take care of everything.",
    },
  },
  {
    id: "ironico",
    it: {
      label: "Ironico", sub: "Giocoso, battute leggere", fullName: "Ironico / Divertente",
      text: `Tono ironico e divertente: giocoso, leggero, fa uso di battute, giochi di parole e piccole storie per intrattenere. Esempio: "Sappiamo che odi i lunedì. Ecco qualcosa che ti farà sorridere (o almeno ci prova)."`,
      characteristics: "Giocoso, leggero, fa uso di battute, giochi di parole e storielle per intrattenere.",
      archetypes: "Burlone (Jester)",
      example: "Sappiamo che odi i lunedì. Ecco qualcosa che ti farà sorridere (o almeno ci prova).",
    },
    en: {
      label: "Witty", sub: "Playful, light jokes", fullName: "Witty / Entertaining",
      text: `Witty and entertaining tone: playful and light, using jokes, wordplay, and short stories to engage people. Example: "We know you hate Mondays. Here's something to make you smile (or at least try)."`,
      characteristics: "Playful and light, using jokes, wordplay, and short stories to entertain.",
      archetypes: "Jester",
      example: "We know you hate Mondays. Here's something to make you smile (or at least try).",
    },
  },
  {
    id: "ispirazionale",
    it: {
      label: "Ispirazionale", sub: "Motivante, epico", fullName: "Ispirazionale / Epico",
      text: `Tono ispirazionale ed epico: evocativo, motivante, orientato al superamento dei limiti e al cambiamento. Esempio: "Il futuro non si aspetta, si costruisce. Abbatti le barriere e libera il tuo potenziale."`,
      characteristics: "Evocativo, motivante, orientato al superamento dei limiti e al cambiamento.",
      archetypes: "Eroe, Ribelle",
      example: "Il futuro non si aspetta, si costruisce. Abbatti le barriere e libera il tuo potenziale.",
    },
    en: {
      label: "Inspirational", sub: "Motivating, epic", fullName: "Inspirational / Epic",
      text: `Inspirational and epic tone: evocative, motivating, focused on overcoming limits and creating change. Example: "The future isn't something you wait for—you build it. Break down barriers and unleash your potential."`,
      characteristics: "Evocative and motivating, focused on overcoming limits and creating change.",
      archetypes: "Hero, Rebel",
      example: "The future isn't something you wait for—you build it. Break down barriers and unleash your potential.",
    },
  },
  {
    id: "tecnico",
    it: {
      label: "Tecnico", sub: "Dati, precisione, oggettività", fullName: "Tecnico / Specialistico",
      text: `Tono tecnico e specialistico: focalizzato su dati, precisione, termini di settore e oggettività. Esempio: "Il nuovo algoritmo ottimizza l'efficienza energetica del 42% riducendo i tempi di latenza."`,
      characteristics: "Focalizzato su dati, precisione scientifica, termini di settore e oggettività.",
      archetypes: "Creatore, Saggio",
      example: "Il nuovo algoritmo ottimizza l'efficienza energetica del 42% riducendo i tempi di latenza.",
    },
    en: {
      label: "Technical", sub: "Data, precision, objectivity", fullName: "Technical / Specialist",
      text: `Technical and specialist tone: focused on data, precision, industry terminology, and objectivity. Example: "The new algorithm improves energy efficiency by 42% while reducing latency."`,
      characteristics: "Focused on data, scientific precision, industry terminology, and objectivity.",
      archetypes: "Creator, Sage",
      example: "The new algorithm improves energy efficiency by 42% while reducing latency.",
    },
  },
  {
    id: "irriverente",
    it: {
      label: "Irriverente", sub: "Diretto, provocatorio", fullName: "Irriverente / Provocatorio",
      text: `Tono irriverente e provocatorio: diretto, audace, rompe gli schemi e sfida lo status quo, a volte con sarcasmo. Esempio: "Le solite regole hanno stancato. È ora di fare di testa propria. Tu da che parte stai?"`,
      characteristics: "Diretto, audace, rompe gli schemi e sfida lo status quo, a volte usando il sarcasmo.",
      archetypes: "Ribelle (Fuorilegge)",
      example: "Le solite regole hanno stancato. È ora di fare di testa propria. Tu da che parte stai?",
    },
    en: {
      label: "Irreverent", sub: "Direct, provocative", fullName: "Irreverent / Provocative",
      text: `Irreverent and provocative tone: direct and bold, breaks conventions and challenges the status quo, sometimes with sarcasm. Example: "The same old rules are getting tired. It's time to do things your own way. Which side are you on?"`,
      characteristics: "Direct and bold, breaks conventions and challenges the status quo, sometimes using sarcasm.",
      archetypes: "Rebel (Outlaw)",
      example: "The same old rules are getting tired. It's time to do things your own way. Which side are you on?",
    },
  },
];