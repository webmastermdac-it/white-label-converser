import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { toast } from "@/hooks/use-toast";

export type Platform = "woocommerce" | "shopify" | "prestashop" | "api" | "feed";

/**
 * Single source of truth for the ecommerce_configs row of the logged client.
 * Extracted from the previous ClientEcommerce page so the Integrations page
 * can reuse the exact same queries / save / sync logic.
 */
export function useEcommerceIntegration(clientIdOverride?: string | null) {
  const { clientId: authClientId } = useAuth();
  const clientId = clientIdOverride ?? authClientId;
  const { lang } = useLanguage();
  const { config: planConfig } = usePlanConfig();
  const isIt = lang === "it";

  const [platform, setPlatform] = useState<Platform>("woocommerce");
  const [storeUrl, setStoreUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedFormat, setFeedFormat] = useState("xml");
  const [configId, setConfigId] = useState<string | null>(null);
  const [savedPlatform, setSavedPlatform] = useState<Platform | null>(null);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [savingAutoSync, setSavingAutoSync] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  const maxProducts = ((planConfig as any)?.max_products ?? -1) as number;

  const loadConfig = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    const { data } = await supabase
      .from("ecommerce_configs" as any)
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setConfigId(d.id);
      setPlatform(d.platform);
      setSavedPlatform(d.platform);
      setSavedPlatform(d.platform);
      setStoreUrl(d.store_url || "");
      setApiKey(d.api_key || "");
      setApiSecret(d.api_secret || "");
      setFeedUrl(d.feed_url || "");
      setFeedFormat(d.feed_format || "xml");
      setSyncStatus(d.sync_status || "idle");
      setSyncError(d.sync_error);
      setLastSyncAt(d.last_sync_at);
      setSyncEnabled(d.sync_enabled !== false);
    }
    setLoading(false);
  }, [clientId]);

  const loadProductCount = useCallback(async () => {
    if (!clientId) return;
    const { count } = await supabase
      .from("products" as any)
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("is_active", true);
    setProductCount(count || 0);
  }, [clientId]);

  const loadSyncHistory = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("sync_logs" as any)
      .select("started_at, status, products_added, products_updated, products_removed")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false })
      .limit(5);
    setSyncHistory((data as any[]) || []);
  }, [clientId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadProductCount(); }, [loadProductCount]);
  useEffect(() => { loadSyncHistory(); }, [loadSyncHistory]);


  const save = async (overridePlatform?: Platform) => {
    if (!clientId) return;
    setSaving(true);
    try {
      const record: any = {
        client_id: clientId,
        platform: overridePlatform || platform,
        store_url: storeUrl,
        api_key: apiKey,
        api_secret: apiSecret,
        feed_url: feedUrl,
        feed_format: feedFormat,
      };
      if (configId) {
        await supabase.from("ecommerce_configs" as any).update(record).eq("id", configId);
        setSavedPlatform(record.platform);
      } else {
        const { data } = await supabase.from("ecommerce_configs" as any).insert(record).select("id").single();
        if (data) setConfigId((data as any).id);
        setSavedPlatform(record.platform);
      }
      toast({ title: isIt ? "Configurazione salvata!" : "Configuration saved!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const sync = async () => {
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
        title: isIt ? "Sincronizzazione completata" : "Sync completed",
        description: isIt
          ? `${data.synced} aggiunti, ${data.updated} aggiornati, ${data.removed} rimossi`
          : `${data.synced} added, ${data.updated} updated, ${data.removed} removed`,
      });
      loadProductCount();
      loadSyncHistory();
    } catch (e: any) {
      setSyncStatus("error");
      setSyncError(e.message);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      loadConfig();
      loadSyncHistory();
    }

  };

  const toggleAutoSync = async (checked: boolean) => {
    if (!configId) return;
    setSavingAutoSync(true);
    const previous = syncEnabled;
    setSyncEnabled(checked);
    const { error } = await supabase
      .from("ecommerce_configs" as any)
      .update({ sync_enabled: checked } as any)
      .eq("id", configId);
    setSavingAutoSync(false);
    if (error) {
      setSyncEnabled(previous);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: checked
        ? (isIt ? "Sincronizzazione automatica attiva" : "Automatic sync enabled")
        : (isIt ? "Sincronizzazione automatica disattivata" : "Automatic sync disabled"),
      description: checked
        ? (isIt ? "Il catalogo verrà aggiornato ogni 6 ore." : "The catalog will refresh every 6 hours.")
        : (isIt ? "Potrai sempre sincronizzare manualmente." : "You can still sync manually."),
    });
  };

  return {
    // state
    loading, saving, syncing, savingAutoSync,
    configId, platform, savedPlatform, storeUrl, apiKey, apiSecret, feedUrl, feedFormat,
    syncStatus, syncError, lastSyncAt, syncEnabled, productCount, maxProducts, syncHistory,
    // setters
    setPlatform, setStoreUrl, setApiKey, setApiSecret, setFeedUrl, setFeedFormat,

    // actions
    save, sync, toggleAutoSync, reload: loadConfig,
  };
}
