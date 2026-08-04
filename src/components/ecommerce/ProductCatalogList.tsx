import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Package, ExternalLink } from "lucide-react";

const PAGE_SIZE = 20;

interface ProductRow {
  id: string;
  external_id: string;
  name: string;
  price: number | null;
  sale_price: number | null;
  currency: string | null;
  in_stock: boolean;
  stock_quantity: number | null;
  categories: string[] | null;
  image_url: string | null;
  product_url: string | null;
  is_active: boolean;
  last_updated: string | null;
}

const ProductCatalogList = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const { clientId } = useAuth();
  const { lang } = useLanguage();
  const isIt = lang === "it";

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    let q = supabase
      .from("products" as any)
      .select(
        "id, external_id, name, price, sale_price, currency, in_stock, stock_quantity, categories, image_url, product_url, is_active, last_updated",
        { count: "exact" }
      )
      .eq("client_id", clientId);

    if (activeFilter !== "all") q = q.eq("is_active", activeFilter === "active");
    if (stockFilter !== "all") q = q.eq("in_stock", stockFilter === "in_stock");
    if (debounced.trim()) q = q.ilike("name", `%${debounced.trim()}%`);

    const { data, count } = await q
      .order("name", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    setRows(((data as any[]) || []) as ProductRow[]);
    setTotal(count || 0);
    setLoading(false);
  }, [clientId, activeFilter, stockFilter, debounced, page]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const fmtPrice = (p: number | null, cur: string | null) =>
    p == null ? "-" : `${Number(p).toFixed(2)} ${cur || "EUR"}`;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={isIt ? "Cerca prodotto..." : "Search product..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isIt ? "Tutti gli stati" : "All statuses"}</SelectItem>
            <SelectItem value="active">{isIt ? "Attivi" : "Active"}</SelectItem>
            <SelectItem value="inactive">{isIt ? "Disattivati" : "Inactive"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full md:w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isIt ? "Tutte le disponibilità" : "All availability"}</SelectItem>
            <SelectItem value="in_stock">{isIt ? "Disponibili" : "In stock"}</SelectItem>
            <SelectItem value="out_of_stock">{isIt ? "Esauriti" : "Out of stock"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isIt ? "Prodotto" : "Product"}</TableHead>
              <TableHead>{isIt ? "Categorie" : "Categories"}</TableHead>
              <TableHead>{isIt ? "Prezzo" : "Price"}</TableHead>
              <TableHead>{isIt ? "Disponibilità" : "Availability"}</TableHead>
              <TableHead>{isIt ? "Stato" : "Status"}</TableHead>
              <TableHead className="text-right">{isIt ? "Aggiornato" : "Updated"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  <Package className="w-5 h-5 mx-auto mb-2 opacity-60" />
                  {isIt ? "Nessun prodotto trovato" : "No products found"}
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3 min-w-[220px]">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-9 h-9 rounded object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[240px]">{p.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        #{p.external_id}
                        {p.product_url && (
                          <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                  {(p.categories || []).slice(0, 3).join(", ") || "-"}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {p.sale_price != null && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price) ? (
                    <span className="flex flex-col">
                      <span className="line-through text-xs text-muted-foreground">{fmtPrice(p.price, p.currency)}</span>
                      <span className="font-medium">{fmtPrice(p.sale_price, p.currency)}</span>
                    </span>
                  ) : (
                    fmtPrice(p.price, p.currency)
                  )}
                </TableCell>
                <TableCell>
                  {p.in_stock ? (
                    <Badge className="bg-green-600 hover:bg-green-600 text-[10px]">
                      {isIt ? "Disponibile" : "In stock"}
                      {p.stock_quantity != null && p.stock_quantity > 0 ? ` (${p.stock_quantity})` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">{isIt ? "Esaurito" : "Out of stock"}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {p.is_active ? (
                    <Badge variant="outline" className="text-[10px]">{isIt ? "Attivo" : "Active"}</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">{isIt ? "Disattivato" : "Inactive"}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {p.last_updated ? new Date(p.last_updated).toLocaleDateString(isIt ? "it-IT" : "en-US") : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isIt ? `${total} prodotti` : `${total} products`}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
            {isIt ? "Indietro" : "Prev"}
          </Button>
          <span>{page + 1} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            {isIt ? "Avanti" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalogList;
