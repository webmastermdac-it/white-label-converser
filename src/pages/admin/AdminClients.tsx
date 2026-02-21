import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Search, Loader2, Trash2, ExternalLink, Users } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  plan: string;
  created_at: string;
}

const plans = ["starter", "pro", "enterprise"];

const AdminClients = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", plan: "starter", password: "" });

  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) ||
           c.email.toLowerCase().includes(search.toLowerCase())
  );

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const createClient = async () => {
    if (!form.name || !form.email || !form.password) {
      toast({ title: t("missingFields"), variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-client", {
        body: { name: form.name, email: form.email, password: form.password, plan: form.plan }
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({ title: t("clientCreated"), description: `${form.name}` });
      setDialogOpen(false);
      setForm({ name: "", email: "", plan: "starter", password: "" });
      fetchClients();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const deleteClient = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("clientDeleted") });
      fetchClients();
    }
  };

  const updatePlan = async (clientId: string, newPlan: string) => {
    const { error } = await supabase.from("clients").update({ plan: newPlan }).eq("id", clientId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("planUpdated"), description: `${t("planChangedTo")} ${newPlan}` });
      fetchClients();
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{t("clients")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("manageClients")}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white border-0 glow-sm">
              <Plus className="w-4 h-4 mr-2" /> {t("addClient")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>{t("createNewClient")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t("companyName")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>{t("email")}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@acme.com" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>{t("temporaryPassword")}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>{t("plan")}</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {plans.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createClient} disabled={creating} className="w-full gradient-primary text-white border-0">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : t("createClient")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchClients")} className="pl-9 bg-secondary border-border" />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("noClientsYet")}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("client")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("plan")}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("created")}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Select value={client.plan} onValueChange={(v) => updatePlan(client.id, v)}>
                      <SelectTrigger className="w-28 h-8 bg-secondary border-border text-xs capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {plans.map((p) => <SelectItem key={p} value={p} className="capitalize text-xs">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{new Date(client.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary w-8 h-8" onClick={() => window.open(`/admin/clients/${client.id}`, '_blank')}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive w-8 h-8" onClick={() => deleteClient(client.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminClients;
