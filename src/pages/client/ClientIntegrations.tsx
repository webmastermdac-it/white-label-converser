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
import {
  Plug, Lock, Loader2, RefreshCw, CheckCircle2, XCircle, Clock,
  Settings2, FileText, CalendarDays, ShoppingBag, Store, ShoppingCart, Sparkles, X, ArrowUpCircle, ArrowLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ProductCatalogList from "@/components/ecommerce/ProductCatalogList";


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
    return !!eco.configId && eco.savedPlatform === id;
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

  const wrapperClass = embedded
    ? "space-y-8 animate-fade-in-up"
    : "p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in-up";

  // ── Dedicated detail page for a single integration ──
  if (openId && activeDef) {
    return (
      <div className={wrapperClass}>
        <button
          onClick={() => setOpenId(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isIt ? "Torna alle integrazioni" : "Back to integrations"}
        </button>

        <div className="flex items-center gap-3">
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${activeDef.color}22` }}
          >
            <activeDef.icon className="w-6 h-6" style={{ color: activeDef.color }} />
          </span>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>{activeDef.name}</h1>
            <p className="text-sm text-muted-foreground">
              {isIt ? "Configura questa integrazione" : "Configure this integration"}
            </p>
          </div>
        </div>

        <div className="glass rounded-xl p-5 md:p-6 max-w-2xl">
          {activeLocked ? (
            <div className="text-center space-y-4">
              <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isIt
                  ? `Questa integrazione è disponibile dal piano ${activeLocked === "starter" ? "Starter" : "Pro"}.`
                  : `This integration is available from the ${activeLocked === "starter" ? "Starter" : "Pro"} plan.`}
              </p>
              <Button onClick={() => navigate("/dashboard/upgrade")} className="w-full">
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                {isIt ? "Sblocca con" : "Unlock with"} {activeLocked === "starter" ? "Starter" : "Pro"}
              </Button>
            </div>
          ) : openId === "calendly" ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>{isIt ? "URL Calendly" : "Calendly URL"}</Label>
                <Input
                  placeholder="https://calendly.com/tuonome/30min"
                  value={cal.calendlyUrl}
                  onChange={(e) => cal.setCalendlyUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {isIt
                    ? "Il bot proporrà la prenotazione quando non sa rispondere o quando l'utente chiede un appuntamento."
                    : "The bot offers booking when it can't answer or when the user asks for an appointment."}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {isIt ? "Anteprima pulsante prenotazione" : "Booking button preview"}
                </Label>
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {isIt ? "Preferisci parlare con noi?" : "Prefer to talk to us?"}
                  </p>
                  <span
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white"
                    style={{ backgroundColor: cal.primaryColor }}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    {isIt ? "Prenota una chiamata" : "Book a call"}
                  </span>
                </div>
              </div>

              <Button onClick={cal.save} disabled={cal.saving} className="w-full">
                {cal.saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isIt ? "Salva" : "Save"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                {openId === "woocommerce" && (
                  <>
                    <div><Label>Store URL</Label><Input placeholder="https://miostore.it" value={eco.storeUrl} onChange={e => eco.setStoreUrl(e.target.value)} /></div>
                    <div><Label>Consumer Key</Label><Input placeholder="ck_..." value={eco.apiKey} onChange={e => eco.setApiKey(e.target.value)} /></div>
                    <div><Label>Consumer Secret</Label><Input type="password" value={eco.apiSecret} onChange={e => eco.setApiSecret(e.target.value)} /></div>
                    <p className="text-xs text-muted-foreground">{isIt ? "Genera le chiavi in WooCommerce → Impostazioni → Avanzate → REST API" : "Generate keys in WooCommerce → Settings → Advanced → REST API"}</p>
                  </>
                )}
                {openId === "shopify" && (
                  <>
                    <div><Label>Store URL</Label><Input placeholder="miostore.myshopify.com" value={eco.storeUrl} onChange={e => eco.setStoreUrl(e.target.value)} /></div>
                    <div><Label>Access Token</Label><Input type="password" value={eco.apiKey} onChange={e => eco.setApiKey(e.target.value)} /></div>
                    <p className="text-xs text-muted-foreground">{isIt ? "Crea una app privata in Shopify Admin → Apps → Develop apps" : "Create a private app in Shopify Admin → Apps → Develop apps"}</p>
                  </>
                )}
                {openId === "prestashop" && (
                  <>
                    <div><Label>Store URL</Label><Input placeholder="https://miostore.it" value={eco.storeUrl} onChange={e => eco.setStoreUrl(e.target.value)} /></div>
                    <div><Label>API Key</Label><Input type="password" value={eco.apiKey} onChange={e => eco.setApiKey(e.target.value)} /></div>
                    <p className="text-xs text-muted-foreground">{isIt ? "Genera la chiave in PrestaShop → Parametri avanzati → Servizi web" : "Generate key in PrestaShop → Advanced Parameters → Web Services"}</p>
                  </>
                )}
                {openId === "api" && (
                  <>
                    <div><Label>Endpoint URL</Label><Input placeholder="https://api.miostore.it/products" value={eco.storeUrl} onChange={e => eco.setStoreUrl(e.target.value)} /></div>
                    <div><Label>Bearer Token ({isIt ? "opzionale" : "optional"})</Label><Input type="password" value={eco.apiKey} onChange={e => eco.setApiKey(e.target.value)} /></div>
                  </>
                )}
                {openId === "feed" && (
                  <>
                    <div><Label>Feed URL</Label><Input placeholder="https://miostore.it/feed/products.xml" value={eco.feedUrl} onChange={e => eco.setFeedUrl(e.target.value)} /></div>
                    <div>
                      <Label>{isIt ? "Formato" : "Format"}</Label>
                      <Select value={eco.feedFormat} onValueChange={eco.setFeedFormat}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xml">XML</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <Button onClick={() => eco.save(openId as Platform)} disabled={eco.saving} className="w-full">
                {eco.saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isIt ? "Salva configurazione" : "Save configuration"}
              </Button>

              {eco.configId && eco.savedPlatform === openId && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <h3 className="text-sm font-semibold">{isIt ? "Sincronizzazione" : "Synchronization"}</h3>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    {eco.syncStatus === "success" && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                    {eco.syncStatus === "error" && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                    {eco.syncStatus === "syncing" && <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />}
                    {eco.syncStatus === "idle" && <Clock className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">
                        {eco.syncStatus === "success" && (isIt ? `Ultima sync: ${eco.lastSyncAt ? new Date(eco.lastSyncAt).toLocaleString("it-IT") : "-"}` : `Last sync: ${eco.lastSyncAt ? new Date(eco.lastSyncAt).toLocaleString() : "-"}`)}
                        {eco.syncStatus === "error" && (isIt ? `Errore: ${eco.syncError}` : `Error: ${eco.syncError}`)}
                        {eco.syncStatus === "syncing" && (isIt ? "Sincronizzazione in corso..." : "Syncing...")}
                        {eco.syncStatus === "idle" && (isIt ? "Nessuna sincronizzazione effettuata" : "No sync performed yet")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        📦 {isIt ? `Prodotti sincronizzati: ${eco.productCount}` : `Synced products: ${eco.productCount}`}
                      </p>
                    </div>
                  </div>

                  <Button onClick={eco.sync} disabled={eco.syncing} variant="outline" className="w-full">
                    <RefreshCw className={`w-4 h-4 mr-2 ${eco.syncing ? "animate-spin" : ""}`} />
                    {isIt ? "Sincronizza ora" : "Sync now"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {eco.maxProducts === -1
                      ? (isIt ? "Prodotti illimitati" : "Unlimited products")
                      : (isIt
                          ? `${eco.productCount} / ${eco.maxProducts} prodotti sincronizzati`
                          : `${eco.productCount} / ${eco.maxProducts} products synced`)}
                  </p>

                  <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">
                        {isIt ? "Sincronizzazione automatica" : "Automatic synchronization"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isIt
                          ? "Se attiva, il catalogo viene riallineato automaticamente ogni 6 ore."
                          : "When enabled, the catalog is refreshed automatically every 6 hours."}
                      </p>
                    </div>
                    <Switch
                      checked={eco.syncEnabled}
                      disabled={eco.savingAutoSync}
                      onCheckedChange={eco.toggleAutoSync}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

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

      {eco.configId && eco.savedPlatform && canUseEcommerce && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {isIt ? "Sincronizzazione catalogo" : "Catalog synchronization"}
          </h2>
          <div className="glass rounded-xl p-5 space-y-4 max-w-2xl">
            <div className="flex items-start gap-3">
              {eco.syncStatus === "success" && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
              {eco.syncStatus === "error" && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
              {eco.syncStatus === "syncing" && <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />}
              {eco.syncStatus === "idle" && <Clock className="w-5 h-5 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium break-words">
                  {eco.syncStatus === "success" && (isIt ? `Ultima sync: ${eco.lastSyncAt ? new Date(eco.lastSyncAt).toLocaleString("it-IT") : "-"}` : `Last sync: ${eco.lastSyncAt ? new Date(eco.lastSyncAt).toLocaleString() : "-"}`)}
                  {eco.syncStatus === "error" && (isIt ? `Errore: ${eco.syncError}` : `Error: ${eco.syncError}`)}
                  {eco.syncStatus === "syncing" && (isIt ? "Sincronizzazione in corso..." : "Syncing...")}
                  {eco.syncStatus === "idle" && (isIt ? "Nessuna sincronizzazione effettuata" : "No sync performed yet")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  📦 {eco.maxProducts === -1
                    ? (isIt ? `${eco.productCount} prodotti (illimitati)` : `${eco.productCount} products (unlimited)`)
                    : `${eco.productCount} / ${eco.maxProducts}`}
                </p>
              </div>
            </div>

            <Button onClick={eco.sync} disabled={eco.syncing} variant="outline" className="w-full">
              <RefreshCw className={`w-4 h-4 mr-2 ${eco.syncing ? "animate-spin" : ""}`} />
              {isIt ? "Sincronizza ora" : "Sync now"}
            </Button>

            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  {isIt ? "Sincronizzazione automatica" : "Automatic synchronization"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isIt
                    ? "Se attiva, il catalogo viene riallineato automaticamente ogni 6 ore."
                    : "When enabled, the catalog is refreshed automatically every 6 hours."}
                </p>
              </div>
              <Switch
                checked={eco.syncEnabled}
                disabled={eco.savingAutoSync}
                onCheckedChange={eco.toggleAutoSync}
              />
            </div>
          </div>

          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold">{isIt ? "Prodotti sincronizzati" : "Synced products"}</h3>
            <ProductCatalogList refreshKey={eco.productCount} />
          </div>
        </section>
      )}




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
