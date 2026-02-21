import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

const COOKIE_KEY = "genius-cookie-consent";

export default function CookieBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem(COOKIE_KEY);
    if (!choice) setVisible(true);
  }, []);

  const handleChoice = (accepted: boolean) => {
    localStorage.setItem(COOKIE_KEY, accepted ? "accepted" : "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[90] bg-[#1A1A2E]/95 backdrop-blur-lg border-t border-white/10 px-4 py-4 sm:py-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-white/70 flex-1 leading-relaxed">
          {t(
            "We use technical cookies for site functionality. No profiling cookies without your consent.",
            "Utilizziamo cookie tecnici per il funzionamento del sito. Nessun cookie di profilazione senza il tuo consenso."
          )}{" "}
          <Link to="/privacy-policy" className="text-[#E94560] hover:underline">
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => handleChoice(false)}
            className="text-sm px-4 py-2 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
          >
            {t("Decline", "Rifiuta")}
          </button>
          <button
            onClick={() => handleChoice(true)}
            className="text-sm px-5 py-2 rounded-full bg-[#E94560] text-white font-semibold hover:bg-[#d63b54] transition-colors"
          >
            {t("Accept", "Accetta")}
          </button>
        </div>
      </div>
    </div>
  );
}
