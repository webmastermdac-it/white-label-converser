import { fmtDay, type Booking } from "@/lib/leadStay";

type Lang = "it" | "en" | "fr" | "de" | "es" | "pt";
const T: Record<Lang, { hello: (n: string) => string; thanks: string; stay: (a: string, b: string) => string; subject: string; subjectStay: (a: string, b: string) => string; close: string }> = {
  it: { hello: (n) => `Gentile ${n},`, thanks: "grazie per averci contattato.", stay: (a, b) => `In merito alla Sua richiesta di soggiorno dal ${a} al ${b}:`, subject: "Risposta alla Sua richiesta", subjectStay: (a, b) => `Il Suo soggiorno dal ${a} al ${b}`, close: "Cordiali saluti" },
  en: { hello: (n) => `Dear ${n},`, thanks: "thank you for contacting us.", stay: (a, b) => `Regarding your stay request from ${a} to ${b}:`, subject: "Reply to your request", subjectStay: (a, b) => `Your stay from ${a} to ${b}`, close: "Kind regards" },
  fr: { hello: (n) => `Cher/Chère ${n},`, thanks: "merci de nous avoir contactés.", stay: (a, b) => `Concernant votre demande de séjour du ${a} au ${b} :`, subject: "Réponse à votre demande", subjectStay: (a, b) => `Votre séjour du ${a} au ${b}`, close: "Cordialement" },
  de: { hello: (n) => `Guten Tag ${n},`, thanks: "vielen Dank für Ihre Anfrage.", stay: (a, b) => `Zu Ihrer Aufenthaltsanfrage vom ${a} bis ${b}:`, subject: "Antwort auf Ihre Anfrage", subjectStay: (a, b) => `Ihr Aufenthalt vom ${a} bis ${b}`, close: "Mit freundlichen Grüßen" },
  es: { hello: (n) => `Estimado/a ${n},`, thanks: "gracias por contactarnos.", stay: (a, b) => `En relación con su solicitud de estancia del ${a} al ${b}:`, subject: "Respuesta a su solicitud", subjectStay: (a, b) => `Su estancia del ${a} al ${b}`, close: "Saludos cordiales" },
  pt: { hello: (n) => `Caro/a ${n},`, thanks: "obrigado por nos contactar.", stay: (a, b) => `Sobre o seu pedido de estadia de ${a} a ${b}:`, subject: "Resposta ao seu pedido", subjectStay: (a, b) => `A sua estadia de ${a} a ${b}`, close: "Com os melhores cumprimentos" },
};

export const isEmail = (v?: string | null) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
/** Digits and a leading + only, so the tel: link works on phones. */
export const telHref = (v?: string | null) => { const d = (v || "").replace(/[^\d+]/g, ""); return d.replace(/\+/g, (m, i) => (i === 0 ? m : "")).length >= 6 ? `tel:${d}` : ""; };

/** mailto: link, written in the language the guest used in the chat. */
export function replyMailto(lead: { name?: string; email?: string; language?: string; booking?: Booking | null }): string {
  if (!isEmail(lead.email)) return "";
  const lang = (String(lead.language || "it").slice(0, 2).toLowerCase() as Lang);
  const t = T[lang] || T.it;
  const hasStay = !!(lead.booking?.check_in && lead.booking?.check_out);
  const a = fmtDay(lead.booking?.check_in), b = fmtDay(lead.booking?.check_out);
  const body = [t.hello(lead.name || ""), "", t.thanks, ...(hasStay ? [t.stay(a, b), ""] : [""]), "", t.close].join("\n");
  const subject = hasStay ? t.subjectStay(a, b) : t.subject;
  return `mailto:${encodeURIComponent(lead.email!.trim()).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
