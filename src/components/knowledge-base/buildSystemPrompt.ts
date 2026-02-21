import { KBSections, KBDocument } from "./types";

interface BuildPromptArgs {
  botName: string;
  sections: KBSections;
  documents: KBDocument[];
  scrapedContent: string;
  fallbackMessage: string;
}

export function buildSystemPrompt({
  botName,
  sections,
  documents,
  scrapedContent,
  fallbackMessage,
}: BuildPromptArgs): string {
  const parts: string[] = [];

  const companyName = sections.about_us?.split("\n")[0]?.trim() || "la nostra azienda";
  parts.push(`Sei ${botName}, l'assistente virtuale di ${companyName}.`);

  if (sections.about_us?.trim()) {
    parts.push(`\n## CHI SIAMO\n${sections.about_us.trim()}`);
  }

  if (sections.products_services?.trim()) {
    parts.push(`\n## PRODOTTI E SERVIZI\n${sections.products_services.trim()}`);
  }

  if (sections.faqs?.length > 0) {
    const faqText = sections.faqs
      .filter((f) => f.question.trim() && f.answer.trim())
      .map((f) => `D: ${f.question.trim()}\nR: ${f.answer.trim()}`)
      .join("\n\n");
    if (faqText) {
      parts.push(`\n## DOMANDE FREQUENTI\n${faqText}`);
    }
  }

  if (sections.tone_of_voice?.trim()) {
    parts.push(`\n## TONO DI VOCE\n${sections.tone_of_voice.trim()}`);
  }

  if (sections.forbidden_topics?.trim()) {
    parts.push(
      `\n## ARGOMENTI VIETATI\nNon rispondere mai a domande riguardanti: ${sections.forbidden_topics.trim()}`
    );
  }

  if (fallbackMessage?.trim()) {
    parts.push(`\nQuando non sai rispondere: ${fallbackMessage.trim()}`);
  }

  if (sections.contacts_hours?.trim()) {
    parts.push(`\n## CONTATTI\n${sections.contacts_hours.trim()}`);
  }

  if (scrapedContent?.trim()) {
    parts.push(`\n## INFORMAZIONI DAL SITO\n${scrapedContent.trim()}`);
  }

  const docTexts = documents
    ?.filter((d) => d.status === "ready" && d.extractedText?.trim())
    .map((d) => d.extractedText.trim());

  if (docTexts?.length) {
    parts.push(`\n## DOCUMENTI CARICATI\n${docTexts.join("\n\n---\n\n")}`);
  }

  return parts.join("\n");
}
