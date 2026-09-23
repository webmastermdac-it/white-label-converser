import { useEffect, useState } from "react";
import { Bot, CheckCheck } from "lucide-react";
import type { VerticalContent } from "@/content/verticals";
import { useLanguage } from "@/hooks/useLanguage";

export default function VerticalDemoChat({ vertical }: { vertical: VerticalContent }) {
  const { lang, t } = useLanguage();
  const userMessage = vertical.demo.user[lang];
  const assistantMessage = vertical.demo.assistant[lang];
  const [phase, setPhase] = useState<"user" | "thinking" | "assistant">("user");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTyped(reduced ? assistantMessage : "");
    setPhase(reduced ? "assistant" : "user");
    if (reduced) return;

    let typingTimer: number | undefined;
    const thinkingTimer = window.setTimeout(() => setPhase("thinking"), 900);
    const answerTimer = window.setTimeout(() => {
      setPhase("assistant");
      let index = 0;
      typingTimer = window.setInterval(() => {
        index += 1;
        setTyped(assistantMessage.slice(0, index));
        if (index >= assistantMessage.length && typingTimer) window.clearInterval(typingTimer);
      }, 18);
    }, 1700);
    const loopTimer = window.setTimeout(() => {
      setTyped("");
      setPhase("user");
    }, 9000);

    return () => {
      window.clearTimeout(thinkingTimer);
      window.clearTimeout(answerTimer);
      window.clearTimeout(loopTimer);
      if (typingTimer) window.clearInterval(typingTimer);
    };
  }, [assistantMessage, vertical.id, phase === "user"]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151B22] shadow-2xl shadow-black/30 overflow-hidden" aria-live="polite">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5A623]/15"><Bot className="h-5 w-5 text-[#F5A623]" /></span>
        <div><p className="text-sm font-semibold">Genius Assistant</p><p className="text-xs text-emerald-400">● {t("Online now", "Online ora")}</p></div>
      </div>
      <div className="min-h-[280px] space-y-4 p-4 sm:p-5">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#F5A623] px-4 py-3 text-sm leading-relaxed text-black">
          {userMessage}<CheckCheck className="ml-auto mt-1 h-3.5 w-3.5 opacity-60" />
        </div>
        {phase === "thinking" && <div className="flex w-16 gap-1 rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3" aria-label={t("Assistant is typing", "L'assistente sta scrivendo")}><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:240ms]" /></div>}
        {phase === "assistant" && <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/85">{typed}<span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-[#F5A623] motion-reduce:hidden" /></div>}
      </div>
    </div>
  );
}
