import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ShoppingCart, RefreshCw, Copy, ChevronDown, Search,
  CheckCircle2, XCircle, Clock, Loader2, ExternalLink, AlertTriangle, ArrowUpCircle, Store
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";

type Platform = "woocommerce" | "shopify" | "prestashop" | "api" | "feed";

const PLATFORMS: { value: Platform; label: string; logo: string }[] = [
  { value: "woocommerce", label: "WooCommerce", logo: "🟣" },
  { value: "shopify", label: "Shopify", logo: "🟢" },
  { value: "prestashop", label: "PrestaShop", logo: "🔵" },
  { value: "api", label: "API Custom", logo: "⚙️" },
  { value: "feed", label: "Feed XML/CSV", logo: "📄" },
];

const ClientEcommerce = () => {
  const { clientId } = useAuth();
  const { lang } = useLanguage();
  const { config: planConfig, loading: planLoading } = usePlanConfig();
  const { plan } = usePlan();
  const navigate = useNavigate();
  const isIt = lang === "it";

  const [platform, setPlatform] = useState<Platform>("woocommerce");
  const [storeUrl, setStoreUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedFormat, setFeedFormat] = useState("xml");
  const [configId, setConfigId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value: unknown) => {
    const amount = typeof value === "number" ? value : parseFloat(String(value ?? "0"));
    return new Intl.NumberFormat(isIt ? "it-IT" : "en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const isStarterOnly = plan === "starter";
  const isFree = plan === "free";

  // Check plan access
  const hasAccess = !isFree;
  const canUseAPI = !isStarterOnly;

  const loadConfig = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("ecommerce_configs" as any)
      .select("*")
      .eq("client_id", clientId)
      .single();
    if (data) {
      const d = data as any;
      setConfigId(d.id);
      setPlatform(d.platform);
      setStoreUrl(d.store_url || "");
      setApiKey(d.api_key || "");
      setApiSecret(d.api_secret || "");
      setFeedUrl(d.feed_url || "");
      setFeedFormat(d.feed_format || "xml");
      setSyncStatus(d.sync_status || "idle");
      setSyncError(d.sync_error);
      setLastSyncAt(d.last_sync_at);
      setWebhookSecret(d.webhook_secret || "");
    }
    setLoading(false);
  }, [clientId]);

  const loadProducts = useCallback(async () => {
    if (!clientId) return;
    let query = supabase
      .from("products" as any)
      .select("*", { count: "exact" })
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("name")
      .range(page * 20, (page + 1) * 20 - 1);

    if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
    if (stockFilter === "in_stock") query = query.eq("in_stock", true);
    if (stockFilter === "out_of_stock") query = query.eq("in_stock", false);

    const { data, count } = await query;
    setProducts((data as any[]) || []);
    setProductCount(count || 0);
  }, [clientId, page, searchQuery, stockFilter]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      const record: any = {
        client_id: clientId,
        platform,
        store_url: storeUrl,
        api_key: apiKey,
        api_secret: apiSecret,
        feed_url: feedUrl,
        feed_format: feedFormat,
      };
      if (configId) {
        await supabase.from("ecommerce_configs" as any).update(record).eq("id", configId);
      } else {
        const { data } = await supabase.from("ecommerce_configs" as any).insert(record).select("id").single();
        if (data) setConfigId((data as any).id);
      }
      toast({ title: isIt ? "Configurazione salvata!" : "Configuration saved!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSync = async () => {
    if (!clientId) return;
    setSyncing(true);
    setSyncStatus("syncing");
    try {
      const { data, error } = await supabase.functions.invoke("sync-products", {
        body: { client_id: clientId },
      });
      if (error) {
        let details = error.message;
        const context = (error as any).context;
        if (context && typeof context.text === "function") {
          try {
            const raw = await context.text();
            const parsed = JSON.parse(raw);
            details = parsed.error || raw;
          } catch {
            details = error.message;
          }
        }
        throw new Error(details);
      }
      setSyncStatus("success");
      setLastSyncAt(new Date().toISOString());
      setSyncError(null);
      toast({
        title: isIt ? "Sincronizzazione completata!" : "Sync completed!",
        description: isIt
          ? `${data.total} prodotti sincronizzati, ${data.deactivated} disattivati`
          : `${data.total} products synced, ${data.deactivated} deactivated`,
      });
      loadProducts();
    } catch (e: any) {
      setSyncStatus("error");
      setSyncError(e.message);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      loadConfig();
    }
  };

  const copyWebhookUrl = () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecommerce-webhook?client=${clientId}`;
    navigator.clipboard.writeText(url);
    toast({ title: isIt ? "URL copiato!" : "URL copied!" });
  };

  if (loading || planLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!hasAccess) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">
          {isIt ? "Integrazione Ecommerce disponibile dal piano Starter" : "Ecommerce integration available from Starter plan"}
        </h2>
        <Button onClick={() => navigate("/dashboard/upgrade")}>
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Upgrade
        </Button>
      </div>
    );
  }

  const apiPlatforms: Platform[] = ["woocommerce", "shopify", "prestashop", "api"];
  const selectedIsAPI = apiPlatforms.includes(platform);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6" />
          {isIt ? "Integrazione Ecommerce" : "Ecommerce Integration"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isIt ? "Connetti il tuo store e sincronizza i prodotti con il chatbot" : "Connect your store and sync products with the chatbot"}
        </p>
      </div>

      {/* Platform selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isIt ? "Connetti il tuo store" : "Connect your store"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={platform} onValueChange={(v) => setPlatform(v as Platform)} className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {PLATFORMS.map(p => {
              const disabled = isStarterOnly && apiPlatforms.includes(p.value);
              return (
                <Label
                  key={p.value}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    platform === p.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <RadioGroupItem value={p.value} disabled={disabled} className="sr-only" />
                  <span className="text-2xl">{p.logo}</span>
                  <span className="text-xs font-medium">{p.label}</span>
                </Label>
              );
            })}
          </RadioGroup>

          {isStarterOnly && selectedIsAPI && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              {isIt
                ? "🛒 Integrazione API disponibile nel piano Pro. Con il piano Starter puoi usare Feed XML/CSV."
                : "🛒 API integration available on Pro plan. Starter plan supports XML/CSV feeds."}
            </div>
          )}

          {/* Dynamic form fields */}
          <div className="space-y-4">
            {(platform === "woocommerce") && (
              <>
                <div><Label>Store URL</Label><Input placeholder="https://miostore.it" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} /></div>
                <div><Label>Consumer Key</Label><Input placeholder="ck_..." value={apiKey} onChange={e => setApiKey(e.target.value)} /></div>
                <div><Label>Consumer Secret</Label><Input type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} /></div>
                <p className="text-xs text-muted-foreground">{isIt ? "Genera le chiavi in WooCommerce → Impostazioni → Avanzate → REST API" : "Generate keys in WooCommerce → Settings → Advanced → REST API"}</p>
              </>
            )}
            {platform === "shopify" && (
              <>
                <div><Label>Store URL</Label><Input placeholder="miostore.myshopify.com" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} /></div>
                <div><Label>Access Token</Label><Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} /></div>
                <p className="text-xs text-muted-foreground">{isIt ? "Crea una app privata in Shopify Admin → Apps → Develop apps" : "Create a private app in Shopify Admin → Apps → Develop apps"}</p>
              </>
            )}
            {platform === "prestashop" && (
              <>
                <div><Label>Store URL</Label><Input placeholder="https://miostore.it" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} /></div>
                <div><Label>API Key</Label><Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} /></div>
                <p className="text-xs text-muted-foreground">{isIt ? "Genera la chiave in PrestaShop → Parametri avanzati → Servizi web" : "Generate key in PrestaShop → Advanced Parameters → Web Services"}</p>
              </>
            )}
            {platform === "api" && (
              <>
                <div><Label>Endpoint URL</Label><Input placeholder="https://api.miostore.it/products" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} /></div>
                <div><Label>Bearer Token ({isIt ? "opzionale" : "optional"})</Label><Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} /></div>
              </>
            )}
            {platform === "feed" && (
              <>
                <div><Label>Feed URL</Label><Input placeholder="https://miostore.it/feed/products.xml" value={feedUrl} onChange={e => setFeedUrl(e.target.value)} /></div>
                <div>
                  <Label>{isIt ? "Formato" : "Format"}</Label>
                  <Select value={feedFormat} onValueChange={setFeedFormat}>
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

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isIt ? "Salva configurazione" : "Save configuration"}
          </Button>
        </CardContent>
      </Card>

      {/* Sync status */}
      {configId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isIt ? "Sincronizzazione" : "Synchronization"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              {syncStatus === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {syncStatus === "error" && <XCircle className="w-5 h-5 text-red-500" />}
              {syncStatus === "syncing" && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
              {syncStatus === "idle" && <Clock className="w-5 h-5 text-muted-foreground" />}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {syncStatus === "success" && (isIt ? `✅ Ultima sync: ${lastSyncAt ? new Date(lastSyncAt).toLocaleString("it-IT") : "-"}` : `✅ Last sync: ${lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "-"}`)}
                  {syncStatus === "error" && (isIt ? `❌ Errore: ${syncError}` : `❌ Error: ${syncError}`)}
                  {syncStatus === "syncing" && (isIt ? "⏳ Sincronizzazione in corso..." : "⏳ Syncing...")}
                  {syncStatus === "idle" && (isIt ? "Nessuna sincronizzazione effettuata" : "No sync performed yet")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  📦 {isIt ? `Prodotti sincronizzati: ${productCount}` : `Synced products: ${productCount}`}
                </p>
              </div>
              <Button onClick={handleSync} disabled={syncing} size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {isIt ? "Sincronizza ora" : "Sync now"}
              </Button>
            </div>

            {/* Webhook section */}
            {canUseAPI && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    <ChevronDown className="w-3 h-3 mr-1" />
                    {isIt ? "Webhook (aggiornamenti real-time)" : "Webhook (real-time updates)"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 p-4 rounded-lg bg-muted/30">
                  <div>
                    <Label className="text-xs">{isIt ? "URL Webhook" : "Webhook URL"}</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        readOnly
                        value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecommerce-webhook?client=${clientId}`}
                        className="text-xs font-mono"
                      />
                      <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {webhookSecret && (
                    <div>
                      <Label className="text-xs">Webhook Secret</Label>
                      <Input readOnly value={webhookSecret} className="text-xs font-mono" type="password" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isIt
                      ? "Incolla questo URL nelle impostazioni webhook della tua piattaforma per ricevere aggiornamenti in tempo reale."
                      : "Paste this URL in your platform's webhook settings to receive real-time updates."}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Products table */}
      {configId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{isIt ? "Prodotti sincronizzati" : "Synced products"}</span>
              <Badge variant="secondary">{productCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isIt ? "Cerca prodotto..." : "Search product..."}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-9"
                />
              </div>
              <Select value={stockFilter} onValueChange={v => { setStockFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isIt ? "Tutti" : "All"}</SelectItem>
                  <SelectItem value="in_stock">{isIt ? "In stock" : "In stock"}</SelectItem>
                  <SelectItem value="out_of_stock">{isIt ? "Esaurito" : "Out of stock"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isIt ? "Nome" : "Name"}</TableHead>
                    <TableHead>{isIt ? "Prezzo" : "Price"}</TableHead>
                    <TableHead>{isIt ? "Disponibilità" : "Availability"}</TableHead>
                    <TableHead>{isIt ? "Categorie" : "Categories"}</TableHead>
                    <TableHead>{isIt ? "Varianti" : "Variants"}</TableHead>
                    <TableHead>{isIt ? "Aggiornato" : "Updated"}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                      <TableCell>
                        {formatCurrency(p.price)}
                        {p.sale_price && <span className="ml-1 text-xs line-through text-muted-foreground">{formatCurrency(p.sale_price)}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.in_stock ? "default" : "destructive"} className={p.in_stock ? "bg-green-600" : ""}>
                          {p.in_stock ? "In stock" : (isIt ? "Esaurito" : "Out")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{(p.categories || []).join(", ") || "-"}</TableCell>
                      <TableCell>
                        {p.variants?.length ? <Badge variant="secondary">{p.variants.length}</Badge> : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.last_updated ? new Date(p.last_updated).toLocaleDateString(isIt ? "it-IT" : "en-US") : "-"}
                      </TableCell>
                      <TableCell>
                        {p.product_url && (
                          <a href={p.product_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {isIt ? "Nessun prodotto trovato" : "No products found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {productCount > 20 && (
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  ←
                </Button>
                <span className="text-sm text-muted-foreground py-2">
                  {page + 1} / {Math.ceil(productCount / 20)}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 20 >= productCount}>
                  →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientEcommerce;
