import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { ArrowDownRight, ArrowUpRight, Loader2, MessageSquare, FileText, MousePointerClick, Euro, Moon, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveModule } from "@/hooks/useActiveModule";
import { useLanguage, tx, appLocale } from "@/hooks/useLanguage";
import { normalizeHotelProfile, type HotelProfile } from "@/lib/hotelProfile";
import { Button } from "@/components/ui/button";

type Session = { started_at: string; language: string | null };
type Lead = { created_at: string; booking: any };
type Ev = { created_at: string };
type Req = { created_at: string; category: string; resolved_at: string | null };

const DAY = 86400000;
const COLORS = ["hsl(35 91% 55%)", "hsl(150 70% 45%)", "hsl(200 90% 55%)", "hsl(280 60% 60%)", "hsl(0 70% 60%)", "hsl(60 80% 50%)", "hsl(220 15% 60%)"];
const romeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });
const romeDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" });

function isOutOfHours(iso: string, open: string, close: string) {
  const hm = romeFmt.format(new Date(iso)).replace("24:", "00:");
  if (open === close) return false;
  return open < close ? hm < open || hm >= close : hm < open && hm >= close;
}
function nights(b: any) {
  const n = Math.round((new Date(b?.check_out).getTime() - new Date(b?.check_in).getTime()) / DAY);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function quoteValue(b: any, hp: HotelProfile) {
  const priced = hp.rooms.filter((r) => r.price_from != null && r.price_from > 0);
  const room = priced.find((r) => r.id === b?.room_id) || priced.sort((a, c) => (a.price_from! - c.price_from!))[0];
  return room ? nights(b) * (room.price_from || 0) : 0;
}
const pctChange = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? null : 0) : Math.round(((cur - prev) / prev) * 100));

const HotelResults = ({ botIdOverride }: { botIdOverride?: string } = {}) => {
  const { contentLang } = useLanguage();
  const tl = (it: string, en: string) => tx(en, it);
  const { botId: activeBotId } = useActiveModule();
  const botId = botIdOverride ?? activeBotId;
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [hp, setHp] = useState<HotelProfile>(normalizeHotelProfile({}));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);

  useEffect(() => {
    if (!botId) return;
    setLoading(true);
    const from = new Date(Date.now() - 2 * days * DAY).toISOString();
    (async () => {
      const [bot, s, l, e, r] = await Promise.all([
        supabase.from("chatbot_configs").select("hotel_profile").eq("id", botId).single(),
        supabase.from("chat_sessions").select("started_at, language").eq("bot_id", botId).gte("started_at", from).limit(10000),
        supabase.from("leads").select("created_at, booking").eq("bot_id", botId).eq("source", "hotel_quote").gte("created_at", from).limit(10000),
        supabase.from("widget_events").select("created_at").eq("bot_id", botId).eq("event", "booking_click").gte("created_at", from).limit(10000),
        supabase.from("service_requests").select("created_at, category, resolved_at").eq("bot_id", botId).gte("created_at", from).limit(10000),
      ]);
      setHp(normalizeHotelProfile((bot.data as any)?.hotel_profile));
      setSessions((s.data || []) as Session[]);
      setLeads((l.data || []) as Lead[]);
      setEvents((e.data || []) as Ev[]);
      setReqs((r.data || []) as Req[]);
      setLoading(false);
    })();
  }, [botId, days]);

  const stats = useMemo(() => {
    const cut = Date.now() - days * DAY;
    const split = <T,>(rows: T[], key: (x: T) => string) => ({
      cur: rows.filter((x) => new Date(key(x)).getTime() >= cut),
      prev: rows.filter((x) => new Date(key(x)).getTime() < cut),
    });
    const { open, close } = { open: hp.property.reception_open, close: hp.property.reception_close };
    const S = split(sessions, (x) => x.started_at), L = split(leads, (x) => x.created_at), E = split(events, (x) => x.created_at), R = split(reqs, (x) => x.created_at);
    const ooh = (rows: Session[]) => (rows.length ? Math.round((rows.filter((x) => isOutOfHours(x.started_at, open, close)).length / rows.length) * 100) : 0);
    const val = (rows: Lead[]) => Math.round(rows.reduce((a, x) => a + quoteValue(x.booking, hp), 0));
    const clickRate = (c: number, q: number) => (q ? Math.round((c / q) * 100) : 0);

    // daily
    const daily: Record<string, { day: string; in: number; out: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const k = romeDay.format(new Date(Date.now() - i * DAY));
      daily[k] = { day: k.slice(5).split("-").reverse().join("/"), in: 0, out: 0 };
    }
    S.cur.forEach((x) => {
      const d = daily[romeDay.format(new Date(x.started_at))];
      if (d) isOutOfHours(x.started_at, open, close) ? d.out++ : d.in++;
    });
    const langNames = new Intl.DisplayNames([contentLang], { type: "language" });
    const langCount: Record<string, number> = {};
    S.cur.forEach((x) => { const c = (x.language || "?").slice(0, 2).toLowerCase(); langCount[c] = (langCount[c] || 0) + 1; });
    const langs = Object.entries(langCount).sort((a, b) => b[1] - a[1]).map(([c, v]) => {
      let name = c; try { if (c !== "?") name = langNames.of(c) || c; } catch { /* keep */ }
      return { name: c === "?" ? tl("Sconosciuta", "Unknown") : name, value: v };
    });
    const catCount: Record<string, number> = {};
    R.cur.forEach((x) => { catCount[x.category] = (catCount[x.category] || 0) + 1; });
    const cats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
    const resolved = R.cur.filter((x) => x.resolved_at);
    const avgRes = resolved.length ? Math.round(resolved.reduce((a, x) => a + (new Date(x.resolved_at!).getTime() - new Date(x.created_at).getTime()), 0) / resolved.length / 60000) : null;
    const monthFmt = new Intl.DateTimeFormat(contentLang, { month: "short", year: "2-digit" });
    const monthCount: Record<string, { name: string; value: number }> = {};
    L.cur.forEach((x) => {
      const ci = x.booking?.check_in; if (!ci) return;
      const k = String(ci).slice(0, 7);
      monthCount[k] = monthCount[k] || { name: monthFmt.format(new Date(ci + "T12:00:00")), value: 0 };
      monthCount[k].value++;
    });
    const months = Object.keys(monthCount).sort().map((k) => monthCount[k]);

    return {
      conv: [S.cur.length, S.prev.length], quotes: [L.cur.length, L.prev.length], clicks: [E.cur.length, E.prev.length],
      clickRate: [clickRate(E.cur.length, L.cur.length), clickRate(E.prev.length, L.prev.length)],
      value: [val(L.cur), val(L.prev)], ooh: [ooh(S.cur), ooh(S.prev)],
      daily: Object.values(daily), langs, cats, avgRes, months, requests: R.cur.length,
    };
  }, [sessions, leads, events, reqs, hp, days, contentLang]);

  const hasData = stats.conv[0] + stats.quotes[0] + stats.clicks[0] + stats.requests > 0;
  const eur = (n: number) => new Intl.NumberFormat(appLocale(), { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const summary = tx("In {0} days the concierge handled {1} conversations, {2}% outside reception hours, and sent {3} guests to your booking engine.", "In {0} giorni il concierge ha gestito {1} conversazioni, {2}% fuori orario, e ha portato {3} ospiti sul tuo booking engine.", [days, stats.conv[0], stats.ooh[0], stats.clicks[0]]);

  const kpis = [
    { icon: MessageSquare, label: tl("Conversazioni", "Conversations"), v: stats.conv, fmt: String },
    { icon: FileText, label: tl("Preventivi richiesti", "Quotes requested"), v: stats.quotes, fmt: String },
    { icon: MousePointerClick, label: tl("Clic \"Verifica disponibilità\"", "\"Check availability\" clicks"), v: stats.clicks, fmt: String, sub: tx("{0}% of quotes", "{0}% dei preventivi", [stats.clickRate[0]]) },
    { icon: Euro, label: tl("Valore preventivi", "Quote value"), v: stats.value, fmt: eur, sub: tl("stima", "estimate") },
    { icon: Moon, label: tl("Fuori orario reception", "Outside reception hours"), v: stats.ooh, fmt: (n: number) => `${n}%`, sub: `${hp.property.reception_open}–${hp.property.reception_close}` },
  ];

  const tip = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" } };
  const ChartCard = ({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-foreground">{title}</h3>{extra}</div>
      <div className="overflow-x-auto"><div className="h-64 min-w-[480px]">{children}</div></div>
    </div>
  );
  const Empty = () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{tl("Nessun dato nel periodo", "No data in this period")}</div>;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tl("Risultati", "Results")}</h1>
          <p className="text-sm text-muted-foreground">{tl("Il valore del tuo concierge in numeri", "Your concierge's value in numbers")}</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{tx("{0} days", "{0} giorni", [d])}</Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !hasData ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">{tl("Ancora nessun dato", "No data yet")}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {tl("I risultati compaiono appena gli ospiti iniziano a usare il concierge. Completa la checklist di attivazione: profilo, camere, widget sul sito e QR in camera.",
              "Results appear as soon as guests start using the concierge. Complete the activation checklist: profile, rooms, website widget and in-room QR.")}
          </p>
          {botId && <Button asChild className="mt-4"><Link to={`/dashboard/bots/${botId}`}>{tl("Vai alla checklist", "Open the checklist")}</Link></Button>}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm font-medium text-foreground md:text-base">{summary}</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((k) => {
              const ch = pctChange(k.v[0], k.v[1]);
              return (
                <div key={k.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><k.icon className="h-4 w-4" />{k.label}</div>
                  <div className="mt-2 text-2xl font-bold text-foreground">{k.fmt(k.v[0])}</div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{k.sub}</span>
                    {ch === null ? <span className="text-muted-foreground">{tl("nuovo", "new")}</span> : (
                      <span className={`flex items-center ${ch >= 0 ? "text-primary" : "text-destructive"}`}>
                        {ch >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(ch)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title={tl("Conversazioni per giorno", "Conversations per day")}>
              <ResponsiveContainer>
                <BarChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip {...tip} />
                  <Legend />
                  <Bar dataKey="in" stackId="a" name={tl("In orario", "Reception open")} fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="out" stackId="a" name={tl("Fuori orario", "Outside hours")} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title={tl("Lingue degli ospiti", "Guest languages")}>
              {stats.langs.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={stats.langs} dataKey="value" nameKey="name" outerRadius={90} label>
                      {stats.langs.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tip} /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>
            <ChartCard title={tl("Richieste dalle camere", "Room requests")}
              extra={<span className="text-xs text-muted-foreground">{tl("Tempo medio risoluzione", "Avg. resolution")}: {stats.avgRes == null ? "—" : stats.avgRes < 60 ? `${stats.avgRes} min` : `${(stats.avgRes / 60).toFixed(1)} h`}</span>}>
              {stats.cats.length ? (
                <ResponsiveContainer>
                  <BarChart data={stats.cats} layout="vertical">
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip {...tip} />
                    <Bar dataKey="value" name={tl("Richieste", "Requests")} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>
            <ChartCard title={tl("Mesi di arrivo richiesti", "Requested arrival months")}>
              {stats.months.length ? (
                <ResponsiveContainer>
                  <BarChart data={stats.months}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip {...tip} />
                    <Bar dataKey="value" name={tl("Preventivi", "Quotes")} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};

export default HotelResults;
