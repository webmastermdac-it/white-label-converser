import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import { useAdminClientFilter } from "@/contexts/AdminClientFilterContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarIcon, Download, TrendingUp, TrendingDown, MessageSquare, Inbox, Percent, Clock, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, subMonths, startOfYear, startOfDay, endOfDay, differenceInDays, formatDistanceToNow } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveModule } from "@/hooks/useActiveModule";
import HotelResults from "@/pages/client/hotel/HotelResults";

interface AnalyticsPageProps {
  isAdmin?: boolean;
}

interface ChatSession {
  id: string;
  started_at: string;
  messages: any;
  client_id: string;
  source_url: string | null;
  language: string | null;
}

interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  status: string;
  source_url: string | null;
  language: string | null;
  client_id: string;
}

type PresetKey = "today" | "7d" | "30d" | "3m" | "year";

const AnalyticsContent: React.FC<AnalyticsPageProps> = ({ isAdmin = false }) => {
  const { clientId, role } = useAuth();
  const { lang } = useLanguage();
  const { canUseAdvancedAnalytics } = usePlanConfig();
  const isIt = lang === "it";

  const [preset, setPreset] = useState<PresetKey>("30d");
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const { selectedClientId: selectedClient } = useAdminClientFilter();
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const hasAccess = canUseAdvancedAnalytics || role === "super_admin";

  const presets: { key: PresetKey; label: string }[] = [
    { key: "today", label: isIt ? "Oggi" : "Today" },
    { key: "7d", label: isIt ? "Ultimi 7 giorni" : "Last 7 days" },
    { key: "30d", label: isIt ? "Ultimi 30 giorni" : "Last 30 days" },
    { key: "3m", label: isIt ? "Ultimi 3 mesi" : "Last 3 months" },
    { key: "year", label: isIt ? "Quest'anno" : "This year" },
  ];

  const applyPreset = (key: PresetKey) => {
    setPreset(key);
    const now = new Date();
    switch (key) {
      case "today": setDateFrom(startOfDay(now)); break;
      case "7d": setDateFrom(subDays(now, 7)); break;
      case "30d": setDateFrom(subDays(now, 30)); break;
      case "3m": setDateFrom(subMonths(now, 3)); break;
      case "year": setDateFrom(startOfYear(now)); break;
    }
    setDateTo(now);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = dateFrom.toISOString();
    const to = endOfDay(dateTo).toISOString();

    let chatsQuery = supabase.from("chat_sessions").select("id, started_at, messages, client_id, source_url, language").gte("started_at", from).lte("started_at", to).order("started_at", { ascending: false }).limit(1000);
    let leadsQuery = supabase.from("leads").select("id, created_at, name, email, status, source_url, language, client_id").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }).limit(1000);

    if (!isAdmin && clientId) {
      chatsQuery = chatsQuery.eq("client_id", clientId);
      leadsQuery = leadsQuery.eq("client_id", clientId);
    }
    if (isAdmin && selectedClient !== "all") {
      chatsQuery = chatsQuery.eq("client_id", selectedClient);
      leadsQuery = leadsQuery.eq("client_id", selectedClient);
    }

    const [chatsRes, leadsRes] = await Promise.all([chatsQuery, leadsQuery]);
    setChats((chatsRes.data as any) || []);
    setLeads((leadsRes.data as any) || []);

    setLoading(false);
  }, [dateFrom, dateTo, clientId, isAdmin, selectedClient]);

  // Fetch recent events for activity feed
  const fetchRecent = useCallback(async () => {
    let recentChats = supabase.from("chat_sessions").select("id, started_at, source_url, language, client_id").order("started_at", { ascending: false }).limit(5);
    let recentLeads = supabase.from("leads").select("id, created_at, name, email, language, client_id").order("created_at", { ascending: false }).limit(5);

    if (!isAdmin && clientId) {
      recentChats = recentChats.eq("client_id", clientId);
      recentLeads = recentLeads.eq("client_id", clientId);
    }
    if (isAdmin && selectedClient !== "all") {
      recentChats = recentChats.eq("client_id", selectedClient);
      recentLeads = recentLeads.eq("client_id", selectedClient);
    }

    const [rc, rl] = await Promise.all([recentChats, recentLeads]);
    const events = [
      ...(rc.data || []).map((c: any) => ({ type: "chat", time: c.started_at, source_url: c.source_url, language: c.language })),
      ...(rl.data || []).map((l: any) => ({ type: "lead", time: l.created_at, name: l.name, email: l.email, language: l.language })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
    setRecentEvents(events);
  }, [clientId, isAdmin, selectedClient]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchRecent(); const iv = setInterval(fetchRecent, 60000); return () => clearInterval(iv); }, [fetchRecent]);

  // Filter by selected client (admin mode)
  const filteredChats = useMemo(() => selectedClient === "all" ? chats : chats.filter(c => c.client_id === selectedClient), [chats, selectedClient]);
  const filteredLeads = useMemo(() => selectedClient === "all" ? leads : leads.filter(l => l.client_id === selectedClient), [leads, selectedClient]);

  // Previous period
  const periodDays = Math.max(differenceInDays(dateTo, dateFrom), 1);
  const prevFrom = subDays(dateFrom, periodDays);
  const prevTo = subDays(dateTo, periodDays);

  const prevChats = useMemo(() => {
    const pf = prevFrom.toISOString();
    const pt = endOfDay(prevTo).toISOString();
    return filteredChats.filter(c => c.started_at >= pf && c.started_at <= pt);
  }, [filteredChats, prevFrom, prevTo]);

  const prevLeads = useMemo(() => {
    const pf = prevFrom.toISOString();
    const pt = endOfDay(prevTo).toISOString();
    return filteredLeads.filter(l => l.created_at >= pf && l.created_at <= pt);
  }, [filteredLeads, prevFrom, prevTo]);

  // We need to also fetch previous period data from DB for accuracy
  // But for simplicity, since we already have the current data, we compute delta from available data
  // The data from DB only covers the selected range, so prev period is empty from the current query.
  // Let's fetch prev period too:
  const [prevChatsCount, setPrevChatsCount] = useState(0);
  const [prevLeadsCount, setPrevLeadsCount] = useState(0);
  const [prevAvgMessages, setPrevAvgMessages] = useState(0);

  useEffect(() => {
    const fetchPrev = async () => {
      const pf = prevFrom.toISOString();
      const pt = endOfDay(prevTo).toISOString();
      let cq = supabase.from("chat_sessions").select("id, messages", { count: "exact" }).gte("started_at", pf).lte("started_at", pt);
      let lq = supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", pf).lte("created_at", pt);
      if (!isAdmin && clientId) { cq = cq.eq("client_id", clientId); lq = lq.eq("client_id", clientId); }
      if (isAdmin && selectedClient !== "all") { cq = cq.eq("client_id", selectedClient); lq = lq.eq("client_id", selectedClient); }
      const [cr, lr] = await Promise.all([cq, lq]);
      setPrevChatsCount(cr.count || 0);
      setPrevLeadsCount(lr.count || 0);
      const prevMsgs = (cr.data || []).map((c: any) => Array.isArray(c.messages) ? c.messages.length : 0);
      setPrevAvgMessages(prevMsgs.length > 0 ? prevMsgs.reduce((a: number, b: number) => a + b, 0) / prevMsgs.length : 0);
    };
    fetchPrev();
  }, [dateFrom, dateTo, clientId, isAdmin, selectedClient]);

  // KPIs
  const totalConv = filteredChats.length;
  const totalLeads = filteredLeads.length;
  const convRate = totalConv > 0 ? ((totalLeads / totalConv) * 100) : 0;
  const avgMessages = useMemo(() => {
    const counts = filteredChats.map(c => Array.isArray(c.messages) ? c.messages.length : 0);
    return counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  }, [filteredChats]);

  const prevConvRate = prevChatsCount > 0 ? ((prevLeadsCount / prevChatsCount) * 100) : 0;

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  };

  // Active clients (admin only)
  const activeClients = useMemo(() => {
    if (!isAdmin) return 0;
    return new Set(filteredChats.map(c => c.client_id)).size;
  }, [filteredChats, isAdmin]);

  // Chart 1: Line chart over time
  const timelineData = useMemo(() => {
    const days = differenceInDays(dateTo, dateFrom);
    const groupByWeek = days > 90;
    const map = new Map<string, { conv: number; leads: number }>();

    filteredChats.forEach(c => {
      const key = groupByWeek
        ? format(new Date(c.started_at), "yyyy-'W'ww")
        : format(new Date(c.started_at), "yyyy-MM-dd");
      map.set(key, { conv: (map.get(key)?.conv || 0) + 1, leads: map.get(key)?.leads || 0 });
    });
    filteredLeads.forEach(l => {
      const key = groupByWeek
        ? format(new Date(l.created_at), "yyyy-'W'ww")
        : format(new Date(l.created_at), "yyyy-MM-dd");
      const existing = map.get(key) || { conv: 0, leads: 0 };
      map.set(key, { ...existing, leads: existing.leads + 1 });
    });

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({
      date: groupByWeek ? date : format(new Date(date), "dd/MM"),
      [isIt ? "Conversazioni" : "Conversations"]: vals.conv,
      Lead: vals.leads,
    }));
  }, [filteredChats, filteredLeads, dateFrom, dateTo, isIt]);

  // Chart 2: Leads by hour
  const hourData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}`, count: 0 }));
    filteredLeads.forEach(l => {
      const h = new Date(l.created_at).getHours();
      hours[h].count++;
    });
    const peak = hours.reduce((max, h) => h.count > max.count ? h : max, hours[0]);
    return { data: hours, peak: peak.hour };
  }, [filteredLeads]);

  // Chart 3: Leads by day of week
  const dayOfWeekData = useMemo(() => {
    const daysIt = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
    const daysEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const labels = isIt ? daysIt : daysEn;
    const counts = Array(7).fill(0);
    filteredLeads.forEach(l => {
      const d = new Date(l.created_at).getDay();
      counts[d === 0 ? 6 : d - 1]++;
    });
    return labels.map((label, i) => ({ day: label, count: counts[i] }));
  }, [filteredLeads, isIt]);

  // Chart 4: Lead status donut
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    const statusLabels: Record<string, string> = isIt
      ? { new: "Nuovo", contacted: "Contattato", closed: "Chiuso" }
      : { new: "New", contacted: "Contacted", closed: "Closed" };
    const statusColors: Record<string, string> = { new: "#6B7280", contacted: "#3B82F6", closed: "#22C55E" };
    return Object.entries(counts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      color: statusColors[status] || "#9CA3AF",
    }));
  }, [filteredLeads, isIt]);

  // Chart 5: Top source pages
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const url = l.source_url || (isIt ? "Sconosciuto" : "Unknown");
      counts[url] = (counts[url] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([url, count]) => ({
        url: url.length > 40 ? url.substring(0, 37) + "..." : url,
        count,
      }));
  }, [filteredLeads, isIt]);

  // CSV Export
  const exportCSV = () => {
    const days = differenceInDays(dateTo, dateFrom);
    const rows: Record<string, { conv: number; leads: number }>= {};
    for (let i = 0; i <= days; i++) {
      const d = format(subDays(dateTo, days - i), "yyyy-MM-dd");
      rows[d] = { conv: 0, leads: 0 };
    }
    filteredChats.forEach(c => { const d = format(new Date(c.started_at), "yyyy-MM-dd"); if (rows[d]) rows[d].conv++; });
    filteredLeads.forEach(l => { const d = format(new Date(l.created_at), "yyyy-MM-dd"); if (rows[d]) rows[d].leads++; });

    const header = "date,conversations,leads,conversion_rate\n";
    const csv = header + Object.entries(rows).map(([date, { conv, leads }]) => {
      const rate = conv > 0 ? ((leads / conv) * 100).toFixed(1) : "0";
      return `${date},${conv},${leads},${rate}%`;
    }).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genius-analytics-${format(dateFrom, "yyyy-MM-dd")}-${format(dateTo, "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const KpiCard = ({ icon: Icon, label, value, prev, suffix = "" }: { icon: any; label: string; value: number; prev: number; suffix?: string }) => {
    const change = pctChange(value, prev);
    const isPositive = change >= 0;
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">{suffix ? `${value.toFixed(1)}${suffix}` : value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change > 0 ? "+" : ""}{change.toFixed(0)}% {isIt ? "vs periodo prec." : "vs prev. period"}
        </div>
      </div>
    );
  };

  // Pro gate overlay
  if (!hasAccess) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            {isIt ? "Analytics" : "Analytics"}
          </h1>
        </div>
        <div className="relative">
          {/* Blurred placeholder */}
          <div className="filter blur-md pointer-events-none select-none opacity-60">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass rounded-xl p-5 h-32" />
              ))}
            </div>
            <div className="glass rounded-xl p-6 h-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-6 h-48" />
              <div className="glass rounded-xl p-6 h-48" />
            </div>
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
            <Lock className="w-10 h-10 text-primary mb-4" />
            <p className="text-lg font-semibold text-foreground text-center">
              {isIt ? "📊 Analytics avanzate disponibili nel piano Pro" : "📊 Advanced analytics available on the Pro plan"}
            </p>
            <Link to="/dashboard/upgrade">
              <Button className="mt-4 gradient-primary text-white border-0">
                {isIt ? "Passa a Pro" : "Upgrade to Pro"} →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            {isIt ? "Analytics" : "Analytics"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isIt ? "Panoramica dettagliata delle performance" : "Detailed performance overview"}
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="shrink-0">
          <Download className="w-4 h-4 mr-2" />
          {isIt ? "Esporta report" : "Export report"}
        </Button>
      </div>




      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map(p => (
          <Button
            key={p.key}
            variant={preset === p.key ? "default" : "outline"}
            size="sm"
            onClick={() => applyPreset(p.key)}
            className="text-xs"
          >
            {p.label}
          </Button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <CalendarIcon className="w-3 h-3 mr-1" />
                {format(dateFrom, "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => { if (d) { setDateFrom(d); setPreset("30d"); } }} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <CalendarIcon className="w-3 h-3 mr-1" />
                {format(dateTo, "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => { if (d) { setDateTo(d); setPreset("30d"); } }} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid gap-4 ${isAdmin ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"}`}>
        <KpiCard icon={MessageSquare} label={isIt ? "Conversazioni totali" : "Total conversations"} value={totalConv} prev={prevChatsCount} />
        <KpiCard icon={Inbox} label={isIt ? "Lead catturati" : "Leads captured"} value={totalLeads} prev={prevLeadsCount} />
        <KpiCard icon={Percent} label={isIt ? "Tasso di conversione" : "Conversion rate"} value={convRate} prev={prevConvRate} suffix="%" />
        <KpiCard icon={Clock} label={isIt ? "Media messaggi/chat" : "Avg messages/chat"} value={avgMessages} prev={prevAvgMessages} />
        {isAdmin && <KpiCard icon={Users} label={isIt ? "Clienti attivi" : "Active clients"} value={activeClients} prev={0} />}
      </div>

      {/* Chart 1: Timeline */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">{isIt ? "Andamento nel tempo" : "Performance over time"}</h3>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Legend />
              <Line type="monotone" dataKey={isIt ? "Conversazioni" : "Conversations"} stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Lead" stroke="#E94560" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">{isIt ? "Nessun dato nel periodo selezionato" : "No data in selected period"}</p>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 2: Leads by hour */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-1">{isIt ? "Distribuzione oraria lead" : "Lead by hour of day"}</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {isIt ? `Ora di picco: ${hourData.peak}:00` : `Peak hour: ${hourData.peak}:00`}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourData.data}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={2} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {hourData.data.map((entry, i) => (
                  <Cell key={i} fill={entry.hour === hourData.peak ? "#F59E0B" : "#E94560"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Leads by day of week */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">{isIt ? "Lead per giorno" : "Leads by day of week"}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayOfWeekData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 4: Lead status donut */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">{isIt ? "Stato dei lead" : "Lead status"}</h3>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map(s => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">{s.value} ({totalLeads > 0 ? ((s.value / totalLeads) * 100).toFixed(0) : 0}%)</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">{isIt ? "Totale:" : "Total:"} {totalLeads}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{isIt ? "Nessun lead" : "No leads"}</p>
          )}
        </div>

        {/* Chart 5: Top source pages */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">{isIt ? "Top pagine sorgente" : "Top source pages"}</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="url" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={150} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{isIt ? "Nessun dato" : "No data"}</p>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">{isIt ? "Attività recente" : "Recent activity"}</h3>
        {recentEvents.length > 0 ? (
          <div className="space-y-3">
            {recentEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <span className="text-lg">{ev.type === "chat" ? "💬" : "📋"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {ev.type === "chat"
                      ? `${isIt ? "Nuova conversazione da" : "New conversation from"} ${ev.source_url || (isIt ? "sconosciuto" : "unknown")}`
                      : `${isIt ? "Nuovo lead:" : "New lead:"} ${ev.name} (${ev.email})`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ev.time), { addSuffix: true, locale: isIt ? itLocale : undefined })}
                  </p>
                </div>
                <span className="text-sm">{ev.language === "en" ? "🇬🇧" : "🇮🇹"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{isIt ? "Nessuna attività recente" : "No recent activity"}</p>
        )}
      </div>
    </div>
  );
};

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ isAdmin = false }) => {
  const { role } = useAuth();
  const { lang } = useLanguage();
  const { module } = useActiveModule();
  const [params, setParams] = useSearchParams();
  const tl = (it: string, en: string) => (lang === "it" ? it : en);
  if (isAdmin || role === "super_admin" || module.id !== "hotel") return <AnalyticsContent isAdmin={isAdmin} />;
  const tab = params.get("tab") === "leads" ? "leads" : "results";
  return (
    <Tabs value={tab} onValueChange={(v) => setParams((p) => { p.set("tab", v); return p; }, { replace: true })}>
      <div className="px-4 pt-4 md:px-6 md:pt-6">
        <TabsList>
          <TabsTrigger value="results">{tl("Risultati concierge", "Concierge results")}</TabsTrigger>
          <TabsTrigger value="leads">{tl("Conversazioni e lead", "Conversations and leads")}</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="results" className="mt-0"><HotelResults /></TabsContent>
      <TabsContent value="leads" className="mt-0"><AnalyticsContent isAdmin={false} /></TabsContent>
    </Tabs>
  );
};

export default AnalyticsPage;
