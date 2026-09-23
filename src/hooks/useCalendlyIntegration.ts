import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";

/**
 * chatbot_configs.calendly_url stays the only source of truth for Calendly,
 * and chatbot_configs.business_vertical the only source for the vertical.
 */
export function useCalendlyIntegration(clientIdOverride?: string | null) {
  const { clientId: authClientId } = useAuth();
  const clientId = clientIdOverride ?? authClientId;
  const { lang } = useLanguage();
  const isIt = lang === "it";

  const [botId, setBotId] = useState<string | null>(null);
  const [botName, setBotName] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#F59E0B");
  const [vertical, setVertical] = useState<"ecommerce" | "booking" | "hotel" | "general">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    const { data } = await supabase
      .from("chatbot_configs")
      .select("id, name, calendly_url, primary_color, business_vertical")
      .eq("client_id", clientId)
      .limit(1)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setBotId(d.id);
      setBotName(d.name || "");
      setCalendlyUrl(d.calendly_url || "");
      setPrimaryColor(d.primary_color || "#F59E0B");
      setVertical((d.business_vertical as any) || "general");
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!botId) return;
    setSaving(true);
    const { error } = await supabase
      .from("chatbot_configs")
      .update({ calendly_url: calendlyUrl } as any)
      .eq("id", botId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isIt ? "Calendly salvato!" : "Calendly saved!" });
  };

  return { botId, botName, calendlyUrl, setCalendlyUrl, primaryColor, vertical, loading, saving, save, reload: load };
}
