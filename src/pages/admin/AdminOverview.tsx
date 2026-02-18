import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Bot, Inbox, MessageSquare, TrendingUp, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  totalClients: number;
  totalLeads: number;
  totalChats: number;
  totalBots: number;
  leadsToday: number;
}

const StatCard = ({
  label, value, icon: Icon, trend, to
}: {
  label: string; value: number | string; icon: React.ElementType; trend?: string; to?: string;
}) => (
  <div className="glass rounded-xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-all duration-200 group">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      {to && (
        <Link to={to} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}
    </div>
    <div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
    {trend && (
      <div className="flex items-center gap-1 text-xs text-green-400">
        <TrendingUp className="w-3 h-3" />
        {trend}
      </div>
    )}
  </div>
);

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0, totalLeads: 0, totalChats: 0, totalBots: 0, leadsToday: 0
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [clients, leads, chats, bots] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("chat_sessions").select("id", { count: "exact", head: true }),
        supabase.from("chatbot_configs").select("id", { count: "exact", head: true }),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const { count: todayLeads } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today);

      setStats({
        totalClients: clients.count || 0,
        totalLeads: leads.count || 0,
        totalChats: chats.count || 0,
        totalBots: bots.count || 0,
        leadsToday: todayLeads || 0,
      });

      const { data: recent } = await supabase
        .from("leads")
        .select("*, clients(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentLeads(recent || []);
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
          Agency Overview
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, Admin</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={stats.totalClients} icon={Users} to="/admin/clients" />
        <StatCard label="Active Bots" value={stats.totalBots} icon={Bot} />
        <StatCard label="Total Leads" value={stats.totalLeads} icon={Inbox} to="/admin/leads" trend={`+${stats.leadsToday} today`} />
        <StatCard label="Chat Sessions" value={stats.totalChats} icon={MessageSquare} to="/admin/chats" />
      </div>

      {/* Recent Leads */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Leads</h2>
          <Link to="/admin/leads" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentLeads.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No leads yet. Deploy your first chatbot to start capturing leads.</p>
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email} · {lead.clients?.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  lead.status === "new" ? "status-new" :
                  lead.status === "contacted" ? "status-contacted" : "status-closed"
                }`}>
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
