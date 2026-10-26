import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, tx } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Globe, Loader2, Settings } from "lucide-react";

interface AdminBotRow {
  id: string;
  name: string;
  site_url: string | null;
  is_active: boolean | null;
  client_id: string;
  client_name: string;
}

const AdminBots = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [bots, setBots] = useState<AdminBotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const tl = (it: string, en: string) => tx(en, it);

  useEffect(() => {
    const loadBots = async () => {
      const { data: configs } = await supabase
        .from("chatbot_configs")
        .select("id, name, site_url, is_active, client_id")
        .eq("is_platform_bot", false)
        .order("created_at", { ascending: true });

      const clientIds = [...new Set((configs || []).map((bot) => bot.client_id))];
      const { data: clients } = clientIds.length > 0
        ? await supabase.from("clients").select("id, name").in("id", clientIds)
        : { data: [] };
      const clientNames = new Map((clients || []).map((client) => [client.id, client.name]));

      setBots((configs || []).map((bot) => ({
        ...bot,
        site_url: bot.site_url || null,
        client_name: clientNames.get(bot.client_id) || tl("Cliente", "Client"),
      })));
      setLoading(false);
    };

    loadBots();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
          {tl("I miei Bot", "My Bots")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tl("Gestisci i chatbot di tutti i clienti", "Manage all client chatbots")}
        </p>
      </div>

      {bots.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-muted-foreground">
          <Bot className="mx-auto mb-3 h-9 w-9" />
          {tl("Nessun chatbot configurato", "No chatbots configured")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {bots.map((bot) => (
            <div key={bot.id} className="glass rounded-xl p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-foreground">{bot.name}</h2>
                  <p className="text-sm text-primary">{bot.client_name}</p>
                  {bot.site_url && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Globe className="h-3 w-3 shrink-0" /> {bot.site_url}
                    </p>
                  )}
                </div>
                <Badge variant={bot.is_active ? "default" : "secondary"}>
                  {bot.is_active ? tl("Attivo", "Active") : tl("Inattivo", "Inactive")}
                </Badge>
              </div>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate(`/admin/bots/${bot.id}`)}>
                <Settings className="h-4 w-4" /> {tl("Configura", "Configure")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBots;