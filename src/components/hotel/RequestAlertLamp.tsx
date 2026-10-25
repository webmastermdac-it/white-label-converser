import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export const SERVICE_REQUEST_LAMP_KEY = "genius-service-request-lamp";

export function useRequestLampPreference() {
  const [lampEnabled, setLampEnabled] = useState(() => localStorage.getItem(SERVICE_REQUEST_LAMP_KEY) !== "false");
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === SERVICE_REQUEST_LAMP_KEY || event.key === null) {
        setLampEnabled(localStorage.getItem(SERVICE_REQUEST_LAMP_KEY) !== "false");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const toggleLamp = (next: boolean) => {
    localStorage.setItem(SERVICE_REQUEST_LAMP_KEY, String(next));
    setLampEnabled(next);
  };
  return { lampEnabled, toggleLamp };
}

export default function RequestAlertLamp({ count, urgent, visible }: { count: number; urgent: boolean; visible: boolean }) {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => lang === "it" ? it : en;
  if (!visible || count === 0) return null;
  return (
    <div className={urgent ? "request-lamp request-lamp-urgent" : "request-lamp"}>
      <div className="request-lamp-frame fixed inset-0 pointer-events-none z-[70]" aria-hidden="true" />
      <div className="request-lamp-band fixed top-0 inset-x-0 z-[70] flex h-9 items-center justify-center gap-2 px-2 text-xs font-semibold" role="status" aria-live="polite">
        <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{count === 1 ? tl("1 richiesta da gestire", "1 request to handle") : tl(`${count} richieste da gestire`, `${count} requests to handle`)}</span>
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-inherit hover:bg-background/20 hover:text-inherit">
          <Link to="/dashboard/hotel/requests">{tl("Apri", "Open")}</Link>
        </Button>
      </div>
    </div>
  );
}