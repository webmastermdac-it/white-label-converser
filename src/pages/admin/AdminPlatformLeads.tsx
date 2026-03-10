import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PLATFORM_CLIENT_ID = "00000000-0000-0000-0000-000000000001";
const statusOptions = ["new", "contacted", "qualified", "converted", "lost"];

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  source_url: string | null;
  language: string | null;
  created_at: string;
  transcript: any;
}

const AdminPlatformLeads = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("client_id", PLATFORM_CLIENT_ID)
      .order("created_at", { ascending: false });
    if (!error && data) setLeads(data as Lead[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status } as any).eq("id", id);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      toast({ title: "Stato aggiornato" });
    }
  };

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportCSV = () => {
    const header = "Nome,Email,Telefono,Messaggio,Stato,Data\n";
    const rows = filtered.map(l =>
      `"${l.name}","${l.email}","${l.phone || ""}","${(l.message || "").replace(/"/g, '""')}","${l.status}","${new Date(l.created_at).toLocaleDateString("it")}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `platform-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "new": return "default";
      case "contacted": return "secondary";
      case "qualified": return "default";
      case "converted": return "default";
      case "lost": return "destructive";
      default: return "outline" as any;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
            🧞 Platform Leads
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lead raccolti dal bot Genius Assistant su chatbot.your-genius.com — {leads.length} totali
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="border-border">
          <Download className="w-4 h-4 mr-2" /> Esporta CSV
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nome o email..." className="pl-9 bg-secondary border-border text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-secondary border-border text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Nessun lead trovato</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.phone || "—"}</TableCell>
                  <TableCell>
                    <Select value={lead.status} onValueChange={v => updateStatus(lead.id, v)}>
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <Badge variant={statusColor(lead.status)} className="text-xs">{lead.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(lead.created_at).toLocaleDateString("it")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {selectedLead.email}</div>
              <div><span className="text-muted-foreground">Telefono:</span> {selectedLead.phone || "—"}</div>
              <div><span className="text-muted-foreground">Messaggio:</span> {selectedLead.message || "—"}</div>
              <div><span className="text-muted-foreground">Sorgente:</span> {selectedLead.source_url || "—"}</div>
              <div><span className="text-muted-foreground">Lingua:</span> {selectedLead.language || "—"}</div>
              <div><span className="text-muted-foreground">Data:</span> {new Date(selectedLead.created_at).toLocaleString("it")}</div>
              {selectedLead.transcript && Array.isArray(selectedLead.transcript) && selectedLead.transcript.length > 0 && (
                <div className="border-t border-border pt-3 mt-3">
                  <p className="font-medium mb-2">Trascrizione chat</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(selectedLead.transcript as any[]).map((msg, i) => (
                      <div key={i} className={`text-xs p-2 rounded-lg ${msg.role === "user" ? "bg-primary/10 text-foreground ml-6" : "bg-secondary text-foreground mr-6"}`}>
                        <span className="font-medium">{msg.role === "user" ? "Visitatore" : "Bot"}:</span> {msg.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlatformLeads;
