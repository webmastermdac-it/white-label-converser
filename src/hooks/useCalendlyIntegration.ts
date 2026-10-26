import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, tx } from "@/hooks/useLanguage";
import { useActiveModule } from "@/hooks/useActiveModule";
import { toast } from "@/hooks/use-toast";

/**
 * chatbot_configs.calendly_url stays the only source of truth for Calendly,
 * and chatbot_configs.business_vertical the only source for the vertical.
 *
 * The bot is resolved from botIdOverride when given, otherwise from
 * useActiveModule() so it always matches the bot shown in the sidebar —
 * never "the first bot of the client".
 */
export function useCalendlyIntegration(clientIdOverride?: string | null, botIdOverride?: string | null) {
  const { clientId: authClientId } = useAuth();
  const clientId = clientIdOverride ?? authClientId;
  const { lang } = useLanguage();
  const { botId: activeBotId } = useActiveModule();
  const targetBotId = botIdOverride ?? activeBotId;

  const [botId, setBotId] = useState<string | null>(null);
  const [botName, setBotName] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [bookingButtonLabel, setBookingButtonLabel] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#F59E0B");
  const [vertical, setVertical] = useState<"ecommerce" | "booking" | "hotel" | "general">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !targetBotId) { setLoading(false); return; }
    const { data } = await supabase
      .from("chatbot_configs")
      .select("id, name, calendly_url, primary_color, business_vertical, booking_button_label")
      .eq("client_id", clientId)
      .eq("id", targetBotId)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setBotId(d.id);
      setBotName(d.name || "");
      setCalendlyUrl(d.calendly_url || "");
      setBookingButtonLabel(d.booking_button_label || "");
      setPrimaryColor(d.primary_color || "#F59E0B");
      setVertical((d.business_vertical as any) || "general");
    }
    setLoading(false);
  }, [clientId, targetBotId]);

  useEffect(() => { load(); }, [load]);

  const save = async (extra?: { booking_button_label?: string | null }) => {
    if (!botId) return;
    setSaving(true);
    const { error } = await supabase
      .from("chatbot_configs")
      .update({ calendly_url: calendlyUrl, ...(extra || {}) } as any)
      .eq("id", botId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: tx("Calendly saved!", "Calendly salvato!") });
  };

  return { botId, botName, calendlyUrl, setCalendlyUrl, bookingButtonLabel, setBookingButtonLabel, primaryColor, vertical, loading, saving, save, reload: load };
}
