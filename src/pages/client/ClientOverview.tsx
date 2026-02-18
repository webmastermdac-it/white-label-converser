import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Inbox, MessageSquare, Bot, TrendingUp, ArrowUpRight, Activity } from "lucide-react";
import { Link } from "react-router-dom";

const ClientOverview = () => {
  const { clientId } = useAuth();
  const [stats, setStats] = useState({ leads: 0, chats: 0, newLeads: 0, isActive: false });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];
      const [leadsCount, chatsCount, newLeadsCount, botStatus, recent] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("client_id", clientId).gte("created_at", today),
        supabase.from("chatbot_configs").select("is_active").eq("client_id", clientId).single(),
        supabase.from("leads").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        leads: leadsCount.count || 0,
        chats: chatsCount.count || 0,
        newLeads: newLeadsCount.count || 0,
        isActive: botStatus.data?.is_active || false,
      });
      setRecentLeads(recent.data || []);
      setLoading(false);
    };

    fetchData();
  }, [clientId]);

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your chatbot performance at a glance</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          stats.isActive ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"
        }`}>
          <Activity className="w-3 h-3" />
          {stats.isActive ? "Bot Active" : "Bot Inactive"}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Leads", value: stats.leads, icon: Inbox, to: "/dashboard/leads" },
          { label: "Chat Sessions", value: stats.chats, icon: MessageSquare, to: "/dashboard/chats" },
          { label: "New Leads Today", value: stats.newLeads, icon: TrendingUp },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-5 group hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              {stat.to && (
                <Link to={stat.to} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Leads</h2>
          <Link to="/dashboard/leads" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-secondary rounded-lg animate-pulse" />)}
          </div>
        ) : recentLeads.length === 0 ? (
          <div className="py-10 text-center">
            <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No leads yet. Deploy your chatbot to start capturing leads!</p>
            <Link to="/dashboard/embed" className="text-primary text-sm hover:underline mt-1 inline-block">Get embed code →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  lead.status === "new" ? "status-new" :
                  lead.status === "contacted" ? "status-contacted" : "status-closed"
                }`}>{lead.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientOverview;
