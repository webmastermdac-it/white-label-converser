import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { useWidgetUrl } from "@/hooks/useWidgetUrl";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Loader2, Plus, Bot, Copy, Code2, Settings, Activity,
  MessageSquare, Inbox, Lock, Globe, Trash2
} from "lucide-react";

interface ChatbotCard {
  id: string;
  name: string;
  site_url: string;
  embed_token: string;
  is_active: boolean;
  lead_count: number;
  chat_count: number;
}

const ClientChatbots = () => {
  const { clientId } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { maxChatbots } = usePlanConfig();
  const widgetUrl = useWidgetUrl();

  const [bots, setBots] = useState<ChatbotCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const tl = (it: string, en: string) => lang === "it" ? it : en;

  const fetchBots = async () => {
    if (!clientId) return;
    const { data: configs } = await supabase
      .from("chatbot_configs")
      .select("id, name, site_url, embed_token, is_active")
      .eq("client_id", clientId)
      .eq("is_platform_bot", false)
      .order("created_at", { ascending: true });

    if (!configs) { setLoading(false); return; }

    // Fetch counts in parallel
    const botsWithCounts = await Promise.all(
      configs.map(async (bot) => {
        const [leads, chats] = await Promise.all([
          supabase.from("leads").select("id", { count: "exact", head: true }).eq("bot_id", bot.id),
          supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("bot_id", bot.id),
        ]);
        return {
          id: bot.id,
          name: bot.name,
          site_url: (bot as any).site_url || "",
          embed_token: bot.embed_token,
          is_active: bot.is_active ?? true,
          lead_count: leads.count || 0,
          chat_count: chats.count || 0,
        };
      })
    );

    setBots(botsWithCounts);
    setLoading(false);
  };

  useEffect(() => { fetchBots(); }, [clientId]);

  const limitReached = maxChatbots !== -1 && bots.length >= maxChatbots;

  const handleCreate = async () => {
    if (!newName.trim() || !newSiteUrl.trim() || !clientId) return;
    if (limitReached) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("chatbot_configs")
        .insert({
          client_id: clientId,
          name: newName.trim(),
          site_url: newSiteUrl.trim(),
        } as any)
        .select()
        .single();
      if (error) throw error;
      toast({ title: "✅", description: tl("Chatbot creato!", "Chatbot created!") });
      setShowCreate(false);
      setNewName("");
      setNewSiteUrl("");
      navigate(`/dashboard/bots/${data.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: t("copied"), description: t("tokenCopied") });
  };

  const copyEmbed = (token: string, name: string) => {
    const snippet = `<!-- ${name} -->\n<script src="${widgetUrl}" data-token="${token}" async></script>`;
    navigator.clipboard.writeText(snippet);
    toast({ title: t("copied"), description: t("embedCopied") });
  };

  const handleDelete = async (bot: ChatbotCard) => {
    if (!confirm(tl(`Eliminare il chatbot "${bot.name}" e tutti i dati associati?`, `Delete chatbot "${bot.name}" and all associated data?`))) return;
    try {
      await supabase.from("chatbot_configs").delete().eq("id", bot.id);
      toast({ title: "✅", description: tl("Chatbot eliminato", "Chatbot deleted") });
      fetchBots();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            {tl("I tuoi Chatbot", "Your Chatbots")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tl("Gestisci tutti i chatbot del tuo account", "Manage all chatbots in your account")}
          </p>
        </div>
        <Button
          onClick={() => limitReached ? null : setShowCreate(true)}
          disabled={limitReached}
          className="gradient-primary text-white border-0 glow-sm gap-2"
        >
          {limitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {tl("Nuovo Chatbot", "New Chatbot")}
        </Button>
      </div>

      {/* Plan usage */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium">
            {bots.length} / {maxChatbots === -1 ? "∞" : maxChatbots} chatbot {tl("attivi", "active")}
          </span>
        </div>
        {limitReached && (
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/upgrade")} className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
            {tl("Upgrade →", "Upgrade →")}
          </Button>
        )}
      </div>

      {/* Chatbot cards */}
      {bots.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{tl("Nessun chatbot. Creane uno per iniziare!", "No chatbots yet. Create one to get started!")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bots.map((bot) => (
            <div key={bot.id} className="glass rounded-xl p-5 group hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground text-base">{bot.name}</h3>
                  {bot.site_url && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Globe className="w-3 h-3" /> {bot.site_url}
                    </p>
                  )}
                </div>
                <Badge variant={bot.is_active ? "default" : "secondary"} className={bot.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}>
                  <Activity className="w-3 h-3 mr-1" />
                  {bot.is_active ? tl("Attivo", "Active") : tl("Inattivo", "Inactive")}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-secondary/50 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">{t("leads")}</p>
                  <p className="text-lg font-bold text-foreground">{bot.lead_count}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">{tl("Conversazioni", "Conversations")}</p>
                  <p className="text-lg font-bold text-foreground">{bot.chat_count}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => navigate(`/dashboard/bots/${bot.id}`)}>
                  <Settings className="w-3.5 h-3.5" /> {tl("Configura", "Configure")}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => copyToken(bot.embed_token)}>
                  <Copy className="w-3.5 h-3.5" /> Token
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => copyEmbed(bot.embed_token, bot.name)}>
                  <Code2 className="w-3.5 h-3.5" /> Embed
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => handleDelete(bot)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tl("Nuovo Chatbot", "New Chatbot")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{tl("Nome del bot", "Bot name")} *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={tl("Es. Bot sito principale", "E.g. Main website bot")}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>{tl("URL del sito", "Site URL")} *</Label>
              <Input
                value={newSiteUrl}
                onChange={(e) => setNewSiteUrl(e.target.value)}
                placeholder="https://mysite.com"
                className="bg-secondary border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{tl("Annulla", "Cancel")}</Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newSiteUrl.trim()}
              className="gradient-primary text-white border-0"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {tl("Crea Chatbot", "Create Chatbot")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientChatbots;
