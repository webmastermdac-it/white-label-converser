import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, tx } from "@/hooks/useLanguage";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, ListChecks } from "lucide-react";
import { getModule } from "@/lib/modules";
import { hotelChecklistStatus } from "@/lib/hotelProfile";

interface Props {
  botId: string;
  clientId: string;
  vertical: string | null;
  calendlyUrl?: string | null;
}

const manualKey = (botId: string) => `genius-checklist-${botId}`;

const ActivationChecklist = ({ botId, clientId, vertical, calendlyUrl }: Props) => {
  const { lang } = useLanguage();
  const tl = (it: string, en: string) => tx(en, it);
  const mod = getModule(vertical);
  const [auto, setAuto] = useState<Record<string, boolean> | null>(null);
  const [manual, setManual] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(manualKey(botId)) || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    if (!mod.checklist.length) return;
    (async () => {
      const [store, products, sessions, kb, faqs, bot] = await Promise.all([
        supabase.from("ecommerce_configs").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
        supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("bot_id", botId),
        supabase.from("knowledge_base").select("id", { count: "exact", head: true }).eq("chatbot_id", botId).eq("status", "ready"),
        supabase.from("faqs").select("id", { count: "exact", head: true }).eq("chatbot_id", botId),
        supabase.from("chatbot_configs").select("hotel_profile").eq("id", botId).maybeSingle(),
      ]);
      setAuto({
        store: (store.count || 0) > 0,
        catalog: (products.count || 0) > 0,
        widget: (sessions.count || 0) > 0,
        services: (kb.count || 0) + (faqs.count || 0) > 0,
        calendly: !!calendlyUrl,
        ...hotelChecklistStatus((bot.data as any)?.hotel_profile),
      });
    })();
  }, [botId, clientId, calendlyUrl, mod.id]);

  if (!mod.checklist.length || !auto) return null;

  const done = (key: string, kind: string) => (kind === "auto" ? !!auto[key] : !!manual[key]);
  const completed = mod.checklist.filter((s) => done(s.key, s.kind)).length;
  if (completed === mod.checklist.length) return null;

  const toggleManual = (key: string) => {
    const next = { ...manual, [key]: !manual[key] };
    setManual(next);
    localStorage.setItem(manualKey(botId), JSON.stringify(next));
  };

  const pct = Math.round((completed / mod.checklist.length) * 100);

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{tl("Checklist di attivazione", "Activation checklist")}</h3>
          <span className="text-xs text-muted-foreground">· {mod.name[lang]}</span>
        </div>
        <span className="text-sm font-medium text-foreground">{completed}/{mod.checklist.length}</span>
      </div>
      <Progress value={pct} className="h-2" />
      <ul className="space-y-2">
        {mod.checklist.map((s) => {
          const isDone = done(s.key, s.kind);
          return (
            <li key={s.key} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-2 min-w-0">
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className={`text-sm ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>{s.label[lang]}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {s.kind === "manual" && (
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => toggleManual(s.key)}>
                    {isDone ? tl("Annulla", "Undo") : tl("Fatto", "Done")}
                  </Button>
                )}
                {!isDone && (
                  <Button size="sm" variant="outline" asChild className="gap-1 text-xs">
                    <Link to={s.href}>{tl("Vai", "Go")} <ArrowRight className="w-3 h-3" /></Link>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ActivationChecklist;
