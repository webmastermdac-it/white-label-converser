export const SUPPORTED_REPLY_LANGS = ["it", "en", "fr", "de", "es", "pt", "nl", "ru", "zh", "ja", "ar", "pl"];
export const baseLangOf = (lang?: string | null) => (String(lang || "").trim().slice(0, 2).toLowerCase() || "en");
export const resolveReplyLang = (lang?: string | null) => {
  const b = baseLangOf(lang);
  return SUPPORTED_REPLY_LANGS.includes(b) ? b : "en";
};
