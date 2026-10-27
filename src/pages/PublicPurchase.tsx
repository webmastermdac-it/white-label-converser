import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { parsePublicCheckoutOffer, stripeCheckoutUrl } from "@/lib/publicCheckout";

export default function PublicPurchase() {
  const [params] = useSearchParams();
  const offer = parsePublicCheckoutOffer(params.get("offerta"));
  const { t } = useLanguage();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requests = useRef(new Map<string, Promise<string>>());

  useEffect(() => {
    if (!offer) return;
    let active = true;
    setError(false);
    const key = `${offer}:${attempt}`;
    let request = requests.current.get(key);
    if (!request) {
      request = (async () => {
        const { data, error: checkoutError } = await supabase.functions.invoke("create-public-checkout", { body: { offer } });
        if (checkoutError) throw checkoutError;
        return stripeCheckoutUrl(data);
      })();
      requests.current.set(key, request);
    }
    request.then((url) => {
      if (active) window.location.replace(url);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [offer, attempt]);

  const title = t("Secure payment with Stripe", "Pagamento sicuro con Stripe");
  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Seo title={`${title} | Genius Chatbot`} path="/acquista" noindex />
      <p className="font-semibold text-primary">Genius Chatbot · MDAC</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {!offer || error ? (
        <>
          <p role="alert" className="max-w-md text-muted-foreground">
            {!offer ? t("Invalid offer. Return to the offers and choose a plan.", "Offerta non valida. Torna alle offerte e scegli un piano.") : t("Unable to open payment. Retry or return to the offers: the offer may no longer be available.", "Impossibile aprire il pagamento. Riprova oppure torna alle offerte: l’offerta potrebbe non essere più disponibile.")}
          </p>
          {offer && <Button onClick={() => setAttempt((value) => value + 1)}><RotateCcw className="mr-2 h-4 w-4" />{t("Retry", "Riprova")}</Button>}
        </>
      ) : <Loader2 role="status" aria-label={title} className="h-8 w-8 animate-spin motion-reduce:animate-none text-primary" />}
      <Button asChild variant="ghost" size="sm">
        <a href="https://conciergeai.your-genius.com/#prezzi"><ArrowLeft className="mr-2 h-4 w-4" />{t("Back", "Indietro")}</a>
      </Button>
    </main>
  );
}