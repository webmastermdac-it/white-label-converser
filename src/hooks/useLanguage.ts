import { useState, useCallback, useContext, createContext, type ReactNode } from "react";
import { translations, type TranslationKey } from "@/i18n/translations";
import React from "react";
import { publicDictionaries } from "@/i18n/public";
import { appDictionaries } from "@/i18n/app";

export type AppLang = "it" | "en" | "de" | "fr" | "es" | "pt";
export const APP_LANGS: AppLang[] = ["it", "en", "fr", "de", "es", "pt"];

/** Translate an English source string into the active language (it/en handled by caller). Falls back to English. */
export function translateFromEnglish(en: string, contentLang: AppLang, it?: string): string {
  if (contentLang === "it") return it ?? en;
  if (contentLang === "en") return en;
  return publicDictionaries[contentLang][en] || appDictionaries[contentLang][en] || en;
}

const LOCALES: Record<AppLang, string> = { it: "it-IT", en: "en-GB", fr: "fr-FR", de: "de-DE", es: "es-ES", pt: "pt-PT" };

// Active language, kept in sync by LanguageProvider so plain helpers (toasts, constants built at render) can translate.
let currentLang: AppLang = typeof window !== "undefined" ? detectLang() : "en";

/** Current UI language outside React hooks. */
export const getAppLang = (): AppLang => currentLang;

/** BCP-47 locale for dates/numbers in the current UI language. */
export const appLocale = (): string => LOCALES[currentLang];

/**
 * Translate a back-office string: English source + Italian version, other languages from the dictionaries.
 * Optional positional values replace {0}, {1}… in the chosen text.
 */
export function tx(en: string, it: string, vars?: ReadonlyArray<unknown>): string {
  const out = translateFromEnglish(en, currentLang, it);
  return vars ? out.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < vars.length ? String(vars[Number(i)]) : m)) : out;
}

export type LocalizedValue = { en: string; it: string } & Partial<Record<"fr" | "de" | "es" | "pt", string>>;
type Lang = "it" | "en";

function detectLang(): AppLang {
  const stored = localStorage.getItem("genius-lang");
  if (stored && (APP_LANGS as string[]).includes(stored)) return stored as AppLang;
  const browser = navigator.language?.slice(0, 2).toLowerCase();
  if (browser && (APP_LANGS as string[]).includes(browser)) return browser as AppLang;
  return "en";
}

interface LanguageContextType {
  lang: Lang;
  contentLang: AppLang;
  setLang: (l: AppLang) => void;
  t: (enOrKey: string, it?: string) => string;
  localized: (text: LocalizedValue) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [contentLang, setContentLang] = useState<AppLang>(detectLang);
  const lang: Lang = contentLang === "it" ? "it" : "en";
  currentLang = contentLang;

  const setLang = useCallback((l: AppLang) => {
    localStorage.setItem("genius-lang", l);
    currentLang = l;
    setContentLang(l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((enOrKey: string, it?: string) => {
    if (it !== undefined) return translateFromEnglish(enOrKey, contentLang, it);
    const entry = translations[enOrKey as TranslationKey];
    if (entry) return translateFromEnglish(entry.en, contentLang, entry.it);
    return translateFromEnglish(enOrKey, contentLang);
  }, [contentLang]);
  const localized = useCallback((text: LocalizedValue) => (contentLang === "it" || contentLang === "en" ? text[contentLang] : text[contentLang] || translateFromEnglish(text.en, contentLang)), [contentLang]);

  return React.createElement(LanguageContext.Provider, { value: { lang, contentLang, setLang, t, localized } }, children);
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
      if (it !== undefined) return translateFromEnglish(enOrKey, contentLang, it);
      const entry = translations[enOrKey as TranslationKey];
      if (entry) return translateFromEnglish(entry.en, contentLang, entry.it);
      return translateFromEnglish(enOrKey, contentLang);
    }, [contentLang]);
    const localized = (text: LocalizedValue) => (contentLang === "it" || contentLang === "en" ? text[contentLang] : text[contentLang] || translateFromEnglish(text.en, contentLang));
    return { lang, contentLang, setLang, t, localized };
  }
  return ctx;
}
