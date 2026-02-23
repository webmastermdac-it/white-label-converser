const langFlagMap: Record<string, string> = {
  it: "🇮🇹",
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  es: "🇪🇸",
  pt: "🇵🇹",
  nl: "🇳🇱",
  ru: "🇷🇺",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ar: "🇸🇦",
  pl: "🇵🇱",
};

export function getLanguageFlag(lang?: string | null): { flag: string; tooltip: string } {
  if (!lang) return { flag: "🌐", tooltip: "Unknown" };
  const base = lang.substring(0, 2).toLowerCase();
  const flag = langFlagMap[base];
  if (flag) return { flag, tooltip: lang };
  return { flag: "🌐", tooltip: lang };
}
