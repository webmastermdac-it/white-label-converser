export interface KBSections {
  about_us: string;
  products_services: string;
  faqs: { question: string; answer: string }[];
  tone_of_voice: string;
  forbidden_topics: string;
  contacts_hours: string;
}

export interface KBDocument {
  id: string;
  filename: string;
  size: number;
  status: "processing" | "ready" | "error";
  extractedText: string;
  storagePath: string;
}

export const defaultSections: KBSections = {
  about_us: "",
  products_services: "",
  faqs: [],
  tone_of_voice: "",
  forbidden_topics: "",
  contacts_hours: "",
};
