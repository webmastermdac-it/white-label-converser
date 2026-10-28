import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tx } from "@/hooks/useLanguage";
import { playNotice, subscribeAudioLock } from "@/lib/playNotice";

/**
 * Browsers keep audio blocked until the page gets a click. While it is blocked and the request sound is on,
 * this button tells the property owner and unlocks it (with a short test sound) in one click.
 */
export default function EnableSoundPrompt({ visible }: { visible: boolean }) {
  const [locked, setLocked] = useState(false);
  useEffect(() => subscribeAudioLock(setLocked), []);
  if (!visible || !locked) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)]" role="status">
      <Button size="sm" className="shadow-lg gap-2 h-10" onClick={() => playNotice()}>
        <BellRing className="w-4 h-4" aria-hidden="true" />
        {tx("Enable request sound", "Attiva il suono delle richieste")}
      </Button>
    </div>
  );
}
