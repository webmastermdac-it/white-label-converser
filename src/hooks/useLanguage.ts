import { useState, useCallback, useContext, createContext, type ReactNode } from "react";
import { translations, type TranslationKey } from "@/i18n/translations";
import React from "react";

type Lang = "it" | "en";

function detectLang(): Lang {
  const stored = localStorage.getItem("genius-lang") as Lang | null;
  if (stored === "it" || stored === "en") return stored;
  return navigator.language?.startsWith("it") ? "it" : "en";
}

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (enOrKey: string, it?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("genius-lang", l);
    setLangState(l);
  }, []);

  const t = useCallback((enOrKey: string, it?: string) => {
    if (it !== undefined) {
      return lang === "it" ? it : enOrKey;
    }
    const entry = translations[enOrKey as TranslationKey];
    if (entry) return entry[lang];
    return enOrKey;
  }, [lang]);

  return React.createElement(LanguageContext.Provider, { value: { lang, setLang, t } }, children);
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback for components outside provider (shouldn't happen in practice)
    const [lang, setLangState] = useState<Lang>(detectLang);
    const setLang = useCallback((l: Lang) => {
      localStorage.setItem("genius-lang", l);
      setLangState(l);
    }, []);
    const t = useCallback((enOrKey: string, it?: string) => {
      if (it !== undefined) return lang === "it" ? it : enOrKey;
      const entry = translations[enOrKey as TranslationKey];
      if (entry) return entry[lang];
      return enOrKey;
    }, [lang]);
    return { lang, setLang, t };
  }
  return ctx;
}
