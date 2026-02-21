import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Inbox, MessageSquare, Bot, TrendingUp, ArrowUpRight, Activity, Settings, Code2, Copy, Sparkles } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RecentLead {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

const ClientOverview = () => {
  const { clientId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState({ leads: 0, leadsThisWeek: 0, chats: 0, isActive: false });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [embedToken, setEmbedToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [clientPlan, setClientPlan] = useState("free");

  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast({ title: "🎉 Pagamento completato!", description: "Benvenuto in Genius Chatbot." });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!clientId) return;

    const fetchData = async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [leadsCount, weekLeads, chatsCount, botStatus, recent, botConfig, clientData] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("created_at", weekAgo),
        supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("chatbot_configs").select("is_active").eq("client_id", clientId).single(),
        supabase.from("leads").select("id, name, email, status, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
        supabase.from("chatbot_configs").select("embed_token").eq("client_id", clientId).single(),
        supabase.from("clients").select("plan").eq("id", clientId).single(),
      ]);

      setStats({
        leads: leadsCount.count || 0,
        leadsThisWeek: weekLeads.count || 0,
        chats: chatsCount.count || 0,
        isActive: botStatus.data?.is_active || false,
      });
      setRecentLeads((recent.data as any) || []);
      setEmbedToken(botConfig.data?.embed_token || "");
      setClientPlan(clientData.data?.plan || "free");
      setLoading(false);
    };

    fetchData();
  }, [clientId]);

  const copyEmbed = () => {
    const snippet = `<script src="${window.location.origin}/widget.js" data-token="${embedToken}" async></script>`;
    navigator.clipboard.writeText(snippet);
    toast({ title: t("copied"), description: t("embedCopied") });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{t("dashboard")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("performanceAtGlance")}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          stats.isActive ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"
        }`}>
          <Activity className="w-3 h-3" />
          {stats.isActive ? t("botActive") : t("botInactive")}
        </div>
      </div>

      {clientPlan === "free" && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("upgradeToProTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("upgradeToProDesc")}</p>
            </div>
          </div>
          <a href="/#pricing">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">Upgrade</Button>
          </a>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: t("totalLeads"), value: stats.leads, icon: Inbox, to: "/dashboard/leads" },
          { label: t("leadsThisWeek"), value: stats.leadsThisWeek, icon: TrendingUp },
          { label: t("chatSessions"), value: stats.chats, icon: MessageSquare, to: "/dashboard/chats" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-5 group hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              {stat.to && (
                <Link to={stat.to} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary/40" onClick={() => navigate("/dashboard/leads")}>
          <Inbox className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">{t("goToLeads")}</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary/40" onClick={() => navigate("/dashboard/bot")}>
          <Settings className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">{t("configureBot")}</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary/40" onClick={copyEmbed} disabled={!embedToken}>
          <Copy className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">{t("copyEmbedCode")}</span>
        </Button>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">{t("recentLeads")}</h2>
          <Link to="/dashboard/leads" className="text-xs text-primary hover:underline">{t("viewAll")}</Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-secondary rounded-lg animate-pulse" />)}
          </div>
        ) : recentLeads.length === 0 ? (
          <div className="py-10 text-center">
            <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">{t("noLeadsDeploy")}</p>
            <Link to="/dashboard/embed" className="text-primary text-sm hover:underline mt-1 inline-block">{t("getEmbedCode")}</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{format(new Date(lead.created_at), "dd/MM")}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    lead.status === "new" ? "bg-blue-500/10 text-blue-400" :
                    lead.status === "contacted" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"
                  }`}>{lead.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientOverview;
