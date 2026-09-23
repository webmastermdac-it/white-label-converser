import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getModule, type ModuleDef } from "@/lib/modules";

const KEY = "genius-active-bot";
export const MODULE_CHANGED_EVENT = "genius-module-changed";

/**
 * Module of the currently selected bot: the bot open in /dashboard/bots/:id,
 * otherwise the last opened bot, otherwise the client's first bot.
 */
export function useActiveModule(): { botId: string | null; module: ModuleDef } {
  const { clientId } = useAuth();
  const { pathname } = useLocation();
  const [botId, setBotId] = useState<string | null>(null);
  const [vertical, setVertical] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener(MODULE_CHANGED_EVENT, h);
    return () => window.removeEventListener(MODULE_CHANGED_EVENT, h);
  }, []);

  useEffect(() => {
    if (!clientId) return;
    const m = pathname.match(/\/dashboard\/bots\/([0-9a-f-]{36})/);
    if (m) localStorage.setItem(KEY, m[1]);
    const wanted = m?.[1] || localStorage.getItem(KEY);
    (async () => {
      const { data } = await supabase
        .from("chatbot_configs")
        .select("id, business_vertical")
        .eq("client_id", clientId)
        .eq("is_platform_bot", false)
        .order("created_at");
      const rows = data || [];
      const row = rows.find((r) => r.id === wanted) || rows[0];
      setBotId(row?.id ?? null);
      setVertical(row?.business_vertical ?? null);
    })();
  }, [clientId, pathname, tick]);

  return { botId, module: getModule(vertical) };
}
