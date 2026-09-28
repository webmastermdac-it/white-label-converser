import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Wrench } from "lucide-react";

interface SetupRow {
  id: string;
  client_id: string;
  status: string;
  phone: string;
  notes: string | null;
  admin_notes: string | null;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
  clients: { name: string; email: string } | null;
}

export const SETUP_REQUESTS_CHANGED = "setup-requests-changed";

const AdminSetupRequests = () => {
  const { lang } = useLanguage();
  const isIt = lang === "it";
  const [rows, setRows] = useState<SetupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const STATUSES = [
    { v: "pending_payment", l: isIt ? "In attesa di pagamento" : "Awaiting payment" },
    { v: "paid", l: isIt ? "Pagato" : "Paid" },
    { v: "contacted", l: isIt ? "Contattato" : "Contacted" },
    { v: "in_progress", l: isIt ? "In lavorazione" : "In progress" },
    { v: "completed", l: isIt ? "Completato" : "Completed" },
    { v: "cancelled", l: isIt ? "Annullato" : "Cancelled" },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("setup_requests")
      .select("id, client_id, status, phone, notes, admin_notes, amount_cents, currency, paid_at, created_at, clients(name, email)")
      .order("created_at", { ascending: false });
    if (!showAll) q = q.not("status", "in", "(pending_payment,cancelled)");
    const { data, error } = await q;
    if (error) toast({ title: error.message, variant: "destructive" });
    const list = (data as unknown as SetupRow[]) || [];
    setRows(list);
    setAdminNotes(Object.fromEntries(list.map((r) => [r.id, r.admin_notes || ""])));
    setLoading(false);
  }, [showAll]);

  useEffect(() => { load(); }, [load]);

  const updateRow = async (id: string, patch: Partial<SetupRow>) => {
    const { error } = await supabase.from("setup_requests").update(patch).eq("id", id);
    if (error) {
      toast({ title: isIt ? "Errore nel salvataggio" : "Save error", description: error.message, variant: "destructive" });
      return false;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    window.dispatchEvent(new Event(SETUP_REQUESTS_CHANGED));
    toast({ title: isIt ? "Salvato" : "Saved" });
    return true;
  };

  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString(isIt ? "it-IT" : "en-GB", { dateStyle: "short", timeStyle: "short" }) : "—");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{isIt ? "Richieste di setup" : "Setup requests"}</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showAll} onCheckedChange={setShowAll} />
          {isIt ? "Mostra non pagate/annullate" : "Show unpaid/cancelled"}
        </label>
      </div>

      <div className="glass rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">{isIt ? "Nessuna richiesta di setup" : "No setup requests"}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isIt ? "Pagamento" : "Paid at"}</TableHead>
                <TableHead>{isIt ? "Cliente" : "Client"}</TableHead>
                <TableHead>{isIt ? "Telefono" : "Phone"}</TableHead>
                <TableHead>{isIt ? "Note" : "Notes"}</TableHead>
                <TableHead>{isIt ? "Importo" : "Amount"}</TableHead>
                <TableHead>{isIt ? "Stato" : "Status"}</TableHead>
                <TableHead>{isIt ? "Note interne" : "Internal notes"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const long = (r.notes?.length || 0) > 80;
                const open = expanded[r.id];
                return (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="whitespace-nowrap text-sm">{fmtDate(r.paid_at)}</TableCell>
                    <TableCell className="text-sm">
                      <Link to={`/admin/clients/${r.client_id}`} className="font-medium text-foreground hover:text-primary">
                        {r.clients?.name || "—"}
                      </Link>
                      <div className="text-xs text-muted-foreground">{r.clients?.email}</div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <a href={`tel:${r.phone.replace(/\s+/g, "")}`} className="text-primary hover:underline">{r.phone}</a>
                    </TableCell>
                    <TableCell className="text-sm max-w-[260px]">
                      {r.notes ? (
                        <>
                          <span className="whitespace-pre-wrap break-words">{long && !open ? `${r.notes.slice(0, 80)}…` : r.notes}</span>
                          {long && (
                            <button className="block text-xs text-primary mt-1" onClick={() => setExpanded((e) => ({ ...e, [r.id]: !open }))}>
                              {open ? (isIt ? "Mostra meno" : "Show less") : (isIt ? "Mostra tutto" : "Show all")}
                            </button>
                          )}
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {(r.amount_cents / 100).toFixed(2)} {r.currency.toUpperCase()}
                    </TableCell>
                    <TableCell className="min-w-[170px]">
                      <Select value={r.status} onValueChange={(v) => updateRow(r.id, { status: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.filter((s) => s.v !== "pending_payment" || r.status === "pending_payment").map((s) => (
                            <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      <Textarea
                        rows={2}
                        value={adminNotes[r.id] ?? ""}
                        onChange={(e) => setAdminNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                        onBlur={() => {
                          const v = adminNotes[r.id] ?? "";
                          if (v !== (r.admin_notes || "")) updateRow(r.id, { admin_notes: v || null });
                        }}
                        className="text-sm"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default AdminSetupRequests;
