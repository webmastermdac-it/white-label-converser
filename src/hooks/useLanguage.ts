import { useState, useCallback } from "react";
import { translations, type TranslationKey } from "@/i18n/translations";

type Lang = "it" | "en";

function detectLang(): Lang {
  const stored = localStorage.getItem("genius-lang") as Lang | null;
  if (stored === "it" || stored === "en") return stored;
  return navigator.language?.startsWith("it") ? "it" : "en";
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("genius-lang", l);
    setLangState(l);
  }, []);

  // Overloaded: t(key) for translation keys, t(en, it) for inline pairs
  const t = useCallback((enOrKey: string, it?: string) => {
    if (it !== undefined) {
      // Legacy inline pair mode: t("English text", "Italian text")
      return lang === "it" ? it : enOrKey;
    }
    // Key-based mode: t("overview")
    const entry = translations[enOrKey as TranslationKey];
    if (entry) return entry[lang];
    return enOrKey;
  }, [lang]);

  return { lang, setLang, t };
}
