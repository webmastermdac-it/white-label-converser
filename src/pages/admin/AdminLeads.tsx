import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Loader2, Download, Search, Filter } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  source_url: string;
  transcript: any[];
  created_at: string;
  language?: string;
  clients?: { name: string };
  chatbot_configs?: { name: string };
}

const statusOptions = ["all", "new", "contacted", "closed"];

const AdminLeads = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = async () => {
    const query = supabase
      .from("leads")
      .select("*, clients(name), chatbot_configs(name)")
      .order("created_at", { ascending: false });

    const { data } = await query;
    setLeads((data || []).map((l: any) => ({ ...l, transcript: Array.isArray(l.transcript) ? l.transcript : [] })));
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      if (selectedLead?.id === id) setSelectedLead((prev) => prev ? { ...prev, status } : null);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Message", "Status", "Client", "Source", "Date"];
    const rows = filtered.map((l) => [
      l.name, l.email, l.phone, l.message, l.status,
      l.clients?.name || "", l.source_url, new Date(l.created_at).toLocaleString()
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
  };

  const filtered = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
                        l.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>All Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">{leads.length} total leads</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="border-border text-muted-foreground hover:text-foreground">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-secondary border-border">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All Status" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No leads found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Lead</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelectedLead(lead)}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground text-sm">
                      {lead.language === "en" ? "🇬🇧" : "🇮🇹"} {lead.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{lead.email} · {lead.phone}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{lead.clients?.name || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      lead.status === "new" ? "status-new" :
                      lead.status === "contacted" ? "status-contacted" : "status-closed"
                    }`}>{lead.status}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Select value={lead.status} onValueChange={(v) => { updateStatus(lead.id, v); }} >
                      <SelectTrigger
                        className="w-28 h-7 text-xs bg-secondary border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {["new", "contacted", "closed"].map((s) => (
                          <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead: {selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="text-sm text-foreground mt-1">{selectedLead.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Phone</Label>
                  <p className="text-sm text-foreground mt-1">{selectedLead.phone || "—"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Message</Label>
                  <p className="text-sm text-foreground mt-1">{selectedLead.message || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Source</Label>
                  <p className="text-sm text-foreground mt-1 truncate">{selectedLead.source_url || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Date</Label>
                  <p className="text-sm text-foreground mt-1">{new Date(selectedLead.created_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedLead.transcript && selectedLead.transcript.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Chat Transcript</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto p-3 bg-secondary rounded-lg">
                    {selectedLead.transcript.map((msg: any, i: number) => (
                      <div key={i} className={`text-xs p-2 rounded-lg ${msg.role === "user" ? "bg-primary/10 text-foreground ml-4" : "bg-card text-muted-foreground mr-4"}`}>
                        <span className="font-medium capitalize">{msg.role}: </span>{msg.content}
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

export default AdminLeads;
