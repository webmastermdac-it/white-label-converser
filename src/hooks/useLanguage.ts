import { useState, useCallback, useContext, createContext, type ReactNode } from "react";
import { translations, type TranslationKey } from "@/i18n/translations";
import React from "react";

export type AppLang = "it" | "en" | "de" | "fr" | "es";
type Lang = "it" | "en";

function detectLang(): AppLang {
  const stored = localStorage.getItem("genius-lang");
  if (stored === "it" || stored === "en" || stored === "de" || stored === "fr" || stored === "es") return stored;
  return navigator.language?.startsWith("it") ? "it" : "en";
}

interface LanguageContextType {
  lang: Lang;
  contentLang: AppLang;
  setLang: (l: AppLang) => void;
  t: (enOrKey: string, it?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [contentLang, setContentLang] = useState<AppLang>(detectLang);
  const lang: Lang = contentLang === "it" ? "it" : "en";

  const setLang = useCallback((l: AppLang) => {
    localStorage.setItem("genius-lang", l);
    setContentLang(l);
  }, []);

  const t = useCallback((enOrKey: string, it?: string) => {
    if (it !== undefined) {
      return lang === "it" ? it : enOrKey;
    }
    const entry = translations[enOrKey as TranslationKey];
    if (entry) return entry[lang];
    return enOrKey;
  }, [lang]);

  return React.createElement(LanguageContext.Provider, { value: { lang, contentLang, setLang, t } }, children);
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback for components outside provider (shouldn't happen in practice)
    const [contentLang, setContentLang] = useState<AppLang>(detectLang);
    const lang: Lang = contentLang === "it" ? "it" : "en";
    const setLang = useCallback((l: AppLang) => {
      localStorage.setItem("genius-lang", l);
      setContentLang(l);
    }, []);
    const t = useCallback((enOrKey: string, it?: string) => {
      if (it !== undefined) return lang === "it" ? it : enOrKey;
      const entry = translations[enOrKey as TranslationKey];
      if (entry) return entry[lang];
      return enOrKey;
    }, [lang]);
    return { lang, contentLang, setLang, t };
  }
  return ctx;
}
