import { useEffect, useState } from "react";
import { Bot, CalendarDays, CheckCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerticalContent } from "@/content/verticals";
import { useLanguage } from "@/hooks/useLanguage";

export default function HotelDemoChat({ vertical }: { vertical: VerticalContent }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(1);
  const userMessage = t(vertical.demo.user.en, vertical.demo.user.it);
  const assistantMessage = t(vertical.demo.assistant.en, vertical.demo.assistant.it);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(4);
      return;
    }
    const timers = [900, 2100, 3300].map((delay, index) => window.setTimeout(() => setVisible(index + 2), delay));
    return () => timers.forEach(window.clearTimeout);
  }, [userMessage]);

  return (
    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#151B22] shadow-2xl shadow-black/30" aria-live="polite">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5A623]/15"><Bot className="h-5 w-5 text-[#F5A623]" /></span>
        <div><p className="text-sm font-semibold">Genius Concierge</p><p className="text-xs text-emerald-400">● {t("Online now", "Online ora")}</p></div>
      </div>
      <div className="min-h-[410px] space-y-3 p-4 sm:p-5">
        <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-[#F5A623] px-4 py-3 text-sm leading-relaxed text-black">
          {userMessage}<CheckCheck className="ml-auto mt-1 h-3.5 w-3.5 opacity-60" />
        </div>
        {visible >= 2 && <div className="hotel-reveal max-w-[92%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/85">{assistantMessage}</div>}
        {visible >= 3 && <div className="hotel-reveal grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0F1419] p-3 text-xs">
          <div className="rounded-lg bg-white/5 p-2"><CalendarDays className="mb-1 h-4 w-4 text-[#F5A623]" /><span className="text-white/45">{t("Arrival", "Arrivo")}</span><p className="mt-0.5 font-semibold">12/08</p></div>
          <div className="rounded-lg bg-white/5 p-2"><CalendarDays className="mb-1 h-4 w-4 text-[#F5A623]" /><span className="text-white/45">{t("Departure", "Partenza")}</span><p className="mt-0.5 font-semibold">14/08</p></div>
          <div className="col-span-2 flex items-center gap-2 rounded-lg bg-white/5 p-2"><Users className="h-4 w-4 text-[#F5A623]" /><span className="text-white/45">{t("Guests", "Ospiti")}</span><strong className="ml-auto">2 + 1</strong></div>
        </div>}
        {visible >= 4 && <Button className="hotel-reveal h-11 w-full rounded-full bg-[#F5A623] font-semibold text-black hover:bg-[#E09800]">{t("Check availability and book", "Verifica disponibilità e prenota")}</Button>}
      </div>
      <style>{`@keyframes hotelReveal{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.hotel-reveal{animation:hotelReveal .45s ease-out both}@media(prefers-reduced-motion:reduce){.hotel-reveal{animation:none}}`}</style>
    </div>
  );
}