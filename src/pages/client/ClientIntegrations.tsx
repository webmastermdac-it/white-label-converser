import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { useEcommerceIntegration, type Platform } from "@/hooks/useEcommerceIntegration";
import { useCalendlyIntegration } from "@/hooks/useCalendlyIntegration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Plug, Lock, Loader2, RefreshCw, CheckCircle2, XCircle, Clock,
  Settings2, FileText, CalendarDays, ShoppingBag, Store, ShoppingCart, Sparkles, X, ArrowUpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type IntegrationId = Platform | "calendly";

interface IntegrationDef {
  id: IntegrationId;
  name: string;
  color: string;
  icon: LucideIcon;
}

const ECOMMERCE_INTEGRATIONS: IntegrationDef[] = [
  { id: "woocommerce", name: "WooCommerce", color: "#7F54B3", icon: ShoppingBag },
  { id: "shopify", name: "Shopify", color: "#95BF47", icon: ShoppingCart },
  { id: "prestashop", name: "PrestaShop", color: "#DF0067", icon: Store },
  { id: "api", name: "API Custom", color: "#64748B", icon: Settings2 },
  { id: "feed", name: "Feed XML/CSV", color: "#0EA5E9", icon: FileText },
];

const APPOINTMENT_INTEGRATIONS: IntegrationDef[] = [
  { id: "calendly", name: "Calendly", color: "#006BFF", icon: CalendarDays },
];

const BANNER_KEY = "integrations_banner_dismissed";

const ClientIntegrations = ({ embedded = false }: { embedded?: boolean }) => {
  const { lang } = useLanguage();
  const isIt = lang === "it";
  const navigate = useNavigate();
  const { canUseCalendly, canUseEcommerce, loading: planLoading } = usePlanConfig();
  const eco = useEcommerceIntegration();
  const cal = useCalendlyIntegration();

  const [openId, setOpenId] = useState<IntegrationId | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(BANNER_KEY) === "1"
  );

  const vertical = cal.vertical;

  const dismissBanner = () => {
    localStorage.setItem(BANNER_KEY, "1");
    setBannerDismissed(true);
  };

  const lockedFor = (id: IntegrationId): false | "starter" | "pro" => {
    if (id === "calendly") return canUseCalendly ? false : "pro";
    if (!canUseEcommerce) return "starter";
    return false;
  };


  const isConnected = (id: IntegrationId) => {
    if (id === "calendly") return !!cal.calendlyUrl;
    return !!eco.configId && eco.platform === id;
  };

  const recommended = (id: IntegrationId) => {
    if (vertical === "ecommerce") return ["woocommerce", "shopify", "prestashop"].includes(id);
    if (vertical === "booking") return id === "calendly";
    return false;
  };

  const categories = useMemo(() => {
    const ecommerceCat = {
      key: "ecommerce",
      title: isIt ? "Ecommerce" : "Ecommerce",
      items: ECOMMERCE_INTEGRATIONS,
    };
    const bookingCat = {
      key: "booking",
      title: isIt ? "Appuntamenti" : "Appointments",
      items: APPOINTMENT_INTEGRATIONS,
    };
    return vertical === "booking" ? [bookingCat, ecommerceCat] : [ecommerceCat, bookingCat];
  }, [vertical, isIt]);

  const bannerText = vertical === "ecommerce"
    ? (isIt
        ? "Hai un ecommerce? Collega il tuo store per far conoscere al bot prodotti, prezzi e disponibilità in tempo reale."
        : "Running an online store? Connect it so the bot knows products, prices and stock in real time.")
    : vertical === "booking"
      ? (isIt
          ? "Offri servizi su appuntamento? Collega Calendly per far prenotare i clienti direttamente in chat."
          : "Offering appointment-based services? Connect Calendly so customers can book right in the chat.")
      : null;

  if (planLoading || eco.loading || cal.loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const activeDef = [...ECOMMERCE_INTEGRATIONS, ...APPOINTMENT_INTEGRATIONS].find(i => i.id === openId);
  const activeLocked = openId ? lockedFor(openId) : false;

  const openCard = (id: IntegrationId) => {
    if (id !== "calendly" && !lockedFor(id)) eco.setPlatform(id as Platform);
    setOpenId(id);
  };

  return (
    <div className={embedded ? "space-y-8 animate-fade-in-up" : "p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in-up"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: "Syne, sans-serif" }}>
            <Plug className="w-6 h-6 text-primary" />
            {isIt ? "Integrazioni" : "Integrations"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isIt ? "Collega i tuoi strumenti al chatbot" : "Connect your tools to the chatbot"}
          </p>
        </div>
      )}


      {bannerText && !bannerDismissed && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground flex-1">{bannerText}</p>
          <button onClick={dismissBanner} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {categories.map((cat) => (
        <section key={cat.key} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{cat.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cat.items.map((item) => {
              const locked = lockedFor(item.id);
              const connected = isConnected(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => openCard(item.id)}
                  className="relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-all text-center"
                >
                  {recommended(item.id) && !locked && (
                    <Badge className="absolute top-2 right-2 bg-primary/15 text-primary border-0 text-[10px]">
                      {isIt ? "Consigliato per te" : "Recommended"}
                    </Badge>
                  )}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}22` }}
                  >
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm font-medium">{item.name}</span>
                  {locked ? (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Lock className="w-3 h-3" />
                      {isIt ? "Bloccato dal piano" : "Locked by plan"}
                    </Badge>
                  ) : connected ? (
                    <Badge className="bg-green-600 hover:bg-green-600 text-[10px]">
                      {isIt ? "Connesso" : "Connected"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      {isIt ? "Non connesso" : "Not connected"}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          {isIt ? "Altro" : "More"}
          <Badge variant="secondary" className="text-[10px]">{isIt ? "Prossimamente" : "Coming soon"}</Badge>
        </h2>
        <div className="p-6 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          {isIt ? "Nuovi connettori in arrivo." : "New connectors coming soon."}
        </div>
      </section>

    </div>
  );
};

export default ClientIntegrations;
