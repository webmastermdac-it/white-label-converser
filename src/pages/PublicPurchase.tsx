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
  const { localized, t } = useLanguage();
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

  const title = localized({
    it: "Pagamento sicuro con Stripe", en: "Secure payment with Stripe",
    fr: "Paiement sécurisé avec Stripe", de: "Sichere Zahlung mit Stripe",
    es: "Pago seguro con Stripe", pt: "Pagamento seguro com Stripe",
  });
  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Seo title={`${title} | Genius Chatbot`} path="/acquista" noindex />
      <p className="font-semibold text-primary">Genius Chatbot · MDAC</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {!offer || error ? (
        <>
          <p role="alert" className="max-w-md text-muted-foreground">
            {!offer ? localized({
              it: "Offerta non valida. Torna alle offerte e scegli un piano.", en: "Invalid offer. Return to the offers and choose a plan.",
              fr: "Offre non valide. Revenez aux offres et choisissez un abonnement.", de: "Ungültiges Angebot. Kehren Sie zu den Angeboten zurück und wählen Sie einen Tarif.",
              es: "Oferta no válida. Vuelve a las ofertas y elige un plan.", pt: "Oferta inválida. Volte às ofertas e escolha um plano.",
            }) : localized({
              it: "Impossibile aprire il pagamento. Riprova oppure torna alle offerte: l’offerta potrebbe non essere più disponibile.",
              en: "Unable to open payment. Retry or return to the offers: the offer may no longer be available.",
              fr: "Impossible d’ouvrir le paiement. Réessayez ou revenez aux offres : l’offre n’est peut-être plus disponible.",
              de: "Die Zahlung konnte nicht geöffnet werden. Versuchen Sie es erneut oder kehren Sie zu den Angeboten zurück: Das Angebot ist möglicherweise nicht mehr verfügbar.",
              es: "No se puede abrir el pago. Inténtalo de nuevo o vuelve a las ofertas: puede que la oferta ya no esté disponible.",
              pt: "Não foi possível abrir o pagamento. Tente novamente ou volte às ofertas: a oferta poderá já não estar disponível.",
            })}
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