import { useState, useEffect, useCallback } from "react";
import { useLanguage, tx, appLocale } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Store, RefreshCw, Loader2 } from "lucide-react";

const AdminEcommerce = () => {
  const { lang } = useLanguage();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadConfigs = useCallback(async () => {
    let query = supabase
      .from("ecommerce_configs" as any)
      .select("*, clients(name, email)")
      .order("created_at", { ascending: false });

    const { data } = await query;
    setConfigs((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  // Get product counts per client
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const clientIds = configs.map(c => c.client_id);
      if (!clientIds.length) return;
      const counts: Record<string, number> = {};
      for (const cid of clientIds) {
        const { count } = await supabase
          .from("products" as any)
          .select("id", { count: "exact", head: true })
          .eq("client_id", cid)
          .eq("is_active", true);
        counts[cid] = count || 0;
      }
      setProductCounts(counts);
    })();
  }, [configs]);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    const enabledConfigs = configs.filter(c => c.sync_enabled);
    let success = 0;
    let errors = 0;
    for (const c of enabledConfigs) {
      try {
        await supabase.functions.invoke("sync-products", { body: { client_id: c.client_id } });
        success++;
      } catch { errors++; }
    }
    toast({
      title: tx("Sync completed", "Sincronizzazione completata"),
      description: tx("{0} succeeded, {1} errors", "{0} riuscite, {1} errori", [success, errors]),
    });
    setSyncingAll(false);
    loadConfigs();
  };

  const filtered = configs.filter(c => {
    if (platformFilter !== "all" && c.platform !== platformFilter) return false;
    if (statusFilter !== "all" && c.sync_status !== statusFilter) return false;
    return true;
  });

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" /> E-commerce e Catalogo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tx("Overview of all client ecommerce integrations", "Panoramica integrazioni ecommerce di tutti i clienti")}
          </p>
        </div>
        <Button onClick={handleSyncAll} disabled={syncingAll}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncingAll ? "animate-spin" : ""}`} />
          {tx("Sync all", "Sincronizza tutti")}
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx("All", "Tutte")}</SelectItem>
            <SelectItem value="woocommerce">WooCommerce</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="prestashop">PrestaShop</SelectItem>
            <SelectItem value="api">API Custom</SelectItem>
            <SelectItem value="feed">Feed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx("All", "Tutti")}</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tx("Client", "Cliente")}</TableHead>
                <TableHead>{tx("Platform", "Piattaforma")}</TableHead>
                <TableHead>{tx("Products", "Prodotti")}</TableHead>
                <TableHead>{tx("Last sync", "Ultima sync")}</TableHead>
                <TableHead>{tx("Status", "Stato")}</TableHead>
                <TableHead>{tx("Actions", "Azioni")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.clients?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{c.clients?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.platform}</Badge></TableCell>
                  <TableCell>{productCounts[c.client_id] ?? "..."}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_sync_at ? new Date(c.last_sync_at).toLocaleString(appLocale()) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.sync_status === "success" ? "default" : c.sync_status === "error" ? "destructive" : "secondary"}
                           className={c.sync_status === "success" ? "bg-green-600" : ""}>
                      {c.sync_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm" variant="ghost"
                      onClick={async () => {
                        try {
                          await supabase.functions.invoke("sync-products", { body: { client_id: c.client_id } });
                          toast({ title: tx("Synced!", "Sincronizzato!") });
                          loadConfigs();
                        } catch (e: any) {
                          toast({ title: "Error", description: e.message, variant: "destructive" });
                        }
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {tx("No ecommerce integrations configured", "Nessuna integrazione ecommerce configurata")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEcommerce;
