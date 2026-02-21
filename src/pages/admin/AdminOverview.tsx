import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Bot, Inbox, MessageSquare, TrendingUp, ArrowUpRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface RecentLead {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  clients: { name: string } | null;
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
  const [stats, setStats] = useState({
    totalClients: 0, totalLeads: 0, totalChats: 0, totalBots: 0, leadsToday: 0, chatsThisWeek: 0
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [clients, leads, chats, bots, todayLeads, weekChats, recent] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("chat_sessions").select("id", { count: "exact", head: true }),
        supabase.from("chatbot_configs").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayStr),
        supabase.from("chat_sessions").select("id", { count: "exact", head: true }).gte("started_at", weekAgo),
        supabase.from("leads").select("id, name, email, status, created_at, clients(name)").order("created_at", { ascending: false }).limit(10),
      ]);

      setStats({
        totalClients: clients.count || 0,
        totalLeads: leads.count || 0,
        totalChats: chats.count || 0,
        totalBots: bots.count || 0,
        leadsToday: todayLeads.count || 0,
        chatsThisWeek: weekChats.count || 0,
      });
      setRecentLeads((recent.data as any) || []);
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
        <p className="text-muted-foreground text-sm mt-1">Panoramica globale della piattaforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clienti Totali" value={stats.totalClients} icon={Users} to="/admin/clients" />
        <StatCard label="Bot Attivi" value={stats.totalBots} icon={Bot} />
        <StatCard label="Lead Totali" value={stats.totalLeads} icon={Inbox} to="/admin/leads" trend={`+${stats.leadsToday} oggi`} />
        <StatCard label="Chat Questa Settimana" value={stats.chatsThisWeek} icon={MessageSquare} to="/admin/chats" />
      </div>

      {/* Recent Leads Table */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Ultimi 10 Lead</h2>
          <Link to="/admin/leads" className="text-xs text-primary hover:underline">Vedi tutti →</Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-secondary rounded-lg animate-pulse" />)}
          </div>
        ) : recentLeads.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nessun lead ancora. Deploya il primo chatbot per iniziare.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Lead</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Stato</th>
                  <th className="pb-2 font-medium text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 text-muted-foreground">{(lead.clients as any)?.name || "—"}</td>
                    <td className="py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="py-3 text-muted-foreground">{lead.email}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        lead.status === "new" ? "bg-blue-500/10 text-blue-400" :
                        lead.status === "contacted" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"
                      }`}>{lead.status}</span>
                    </td>
                    <td className="py-3 text-right text-muted-foreground text-xs">
                      {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
