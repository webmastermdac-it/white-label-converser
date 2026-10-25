import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Instagram, CheckCircle2, ArrowUpCircle, Loader2, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft } from "lucide-react";

const ClientInstagram = () => {
  const { clientId } = useAuth();
  const { config: planConfig, loading: planLoading } = usePlanConfig();
  const { plan } = usePlan();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const backLink = (
    <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
      <Link to="/dashboard/integrations"><ArrowLeft className="w-4 h-4 mr-1" />{lang === "it" ? "Torna alle integrazioni" : "Back to integrations"}</Link>
    </Button>
  );

  const [bots, setBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [bot, setBot] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });

  // Manual connection inputs
  const [manualToken, setManualToken] = useState("");
  const [manualPageId, setManualPageId] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [connecting, setConnecting] = useState(false);

  const hasAccess = plan === "pro" || (planConfig as any)?.instagram_integration;

  const loadBots = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("chatbot_configs")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_platform_bot", false)
      .order("created_at", { ascending: true });
    setBots(data || []);
    if (data && data.length && !selectedBotId) setSelectedBotId(data[0].id);
    setLoading(false);
  }, [clientId, selectedBotId]);

  const loadMessages = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("instagram_messages" as any)
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50);
    setMessages((data as any[]) || []);

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
    const all = (data as any[]) || [];
    setStats({
      today: all.filter((m) => m.direction === "inbound" && m.created_at >= startToday).length,
      week: all.filter((m) => m.direction === "inbound" && m.created_at >= startWeek).length,
      total: all.filter((m) => m.direction === "inbound").length,
    });
  }, [clientId]);

  useEffect(() => {
    loadBots();
    loadMessages();
  }, [loadBots, loadMessages]);

  useEffect(() => {
    setBot(bots.find((b) => b.id === selectedBotId) || null);
  }, [selectedBotId, bots]);

  const handleConnectManual = async () => {
    if (!selectedBotId || !manualToken || !manualPageId) {
      toast({ title: "Compila tutti i campi", variant: "destructive" });
      return;
    }
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("save-channel-secret", {
      body: {
        bot_id: selectedBotId,
        channel: "instagram",
        access_token: manualToken,
        page_id: manualPageId,
        username: manualUsername || "instagram_user",
      },
    });
    setConnecting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Connessione fallita", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Instagram collegato!" });
    setManualToken(""); setManualPageId(""); setManualUsername("");
    loadBots();
  };

  const handleDisconnect = async () => {
    const { error } = await supabase.functions.invoke("instagram-disconnect", {
      body: { bot_id: selectedBotId },
    });
    if (error) {
      toast({ title: "Errore", variant: "destructive" });
      return;
    }
    toast({ title: "Instagram disconnesso" });
    loadBots();
  };

  const toggleActive = async (val: boolean) => {
    await supabase.from("chatbot_configs").update({ is_active: val }).eq("id", selectedBotId);
    loadBots();
  };

  if (planLoading || loading) {
    return <div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  // Upgrade gate
  if (!hasAccess) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        {backLink}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Instagram className="w-6 h-6 text-pink-500" />
              Integrazione Instagram DM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Connetti il tuo profilo Instagram Business e fai rispondere il chatbot ai DM 24/7.
            </p>
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-start gap-3">
              <ArrowUpCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">Funzionalità disponibile sul piano Pro</p>
                <p className="text-sm text-muted-foreground">Passa a Pro per attivare Instagram DM.</p>
              </div>
            </div>
            <Button onClick={() => navigate("/dashboard/upgrade")}>
              <ArrowUpCircle className="w-4 h-4 mr-2" /> Passa a Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConnected = !!bot?.instagram_connected;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>{backLink}</div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Instagram className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Integrazione Instagram DM</h1>
          <p className="text-sm text-muted-foreground">Risposte automatiche AI ai messaggi Instagram</p>
        </div>
      </div>

      {bots.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <Label>Seleziona chatbot</Label>
            <Select value={selectedBotId} onValueChange={setSelectedBotId}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {bots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {!isConnected ? (
        <Card>
          <CardHeader><CardTitle>Connetti Instagram</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Profilo Instagram Business o Creator</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Pagina Facebook collegata all'account</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> App Meta con permessi messaging</div>
            </div>

            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
              <span>Richiede approvazione App Meta per la produzione. Per testing, inserisci manualmente il Page Access Token e l'Instagram Business Account ID generati dal tuo Meta App.</span>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <p className="font-semibold text-sm">Connessione manuale</p>
              <div>
                <Label>Page Access Token (long-lived)</Label>
                <Input value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="EAAG..." />
              </div>
              <div>
                <Label>Instagram Business Account ID</Label>
                <Input value={manualPageId} onChange={(e) => setManualPageId(e.target.value)} placeholder="178414... " />
              </div>
              <div>
                <Label>Username Instagram (opzionale)</Label>
                <Input value={manualUsername} onChange={(e) => setManualUsername(e.target.value)} placeholder="@miobrand" />
              </div>
              <Button onClick={handleConnectManual} disabled={connecting}>
                {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                Connetti Instagram
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Badge className="bg-green-600">Connesso</Badge>
                  <span>@{bot.instagram_username}</span>
                </CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">Disconnetti</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnettere Instagram?</AlertDialogTitle>
                      <AlertDialogDescription>Il bot smetterà di rispondere ai DM.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnect}>Disconnetti</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connesso il {bot.instagram_connected_at ? new Date(bot.instagram_connected_at).toLocaleString("it-IT") : "-"}
              </p>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="font-semibold">Risposte automatiche</Label>
                  <p className="text-xs text-muted-foreground">Il bot risponde ai DM in arrivo</p>
                </div>
                <Switch checked={!!bot.is_active} onCheckedChange={toggleActive} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Oggi</p><p className="text-2xl font-bold">{stats.today}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Ultimi 7 giorni</p><p className="text-2xl font-bold">{stats.week}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Totale</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Ultimi messaggi Instagram</CardTitle></CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun messaggio ancora.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mittente</TableHead>
                      <TableHead>Direzione</TableHead>
                      <TableHead>Messaggio</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.instagram_sender_username || m.instagram_sender_id}</TableCell>
                        <TableCell>
                          <Badge variant={m.direction === "inbound" ? "secondary" : "default"}>
                            {m.direction === "inbound" ? "ricevuto" : "bot"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{m.message}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("it-IT")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClientInstagram;
