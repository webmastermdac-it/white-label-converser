import { useState, useEffect } from "react";

type Lang = "it" | "en";

function detectLang(): Lang {
  const stored = localStorage.getItem("genius-lang") as Lang | null;
  if (stored === "it" || stored === "en") return stored;
  return navigator.language?.startsWith("it") ? "it" : "en";
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = (l: Lang) => {
    localStorage.setItem("genius-lang", l);
    setLangState(l);
  };

  const t = (en: string, it: string) => (lang === "it" ? it : en);

  return { lang, setLang, t };
}
