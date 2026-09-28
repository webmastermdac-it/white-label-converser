import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Save } from "lucide-react";

const DEFAULTS = {
  welcome_msg_it: "Ciao! Sono un assistente virtuale basato su intelligenza artificiale. Come posso aiutarti?",
  welcome_msg_en: "Hello! I'm an AI-based virtual assistant. How can I help you?",
  fallback_msg_it: "Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!",
  fallback_msg_en: "I don't have this information, but I can connect you with one of our consultants!",
};

type Msgs = typeof DEFAULTS;

const BotMessagesCard = ({ chatbotId }: { chatbotId: string }) => {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const tl = (it: string, en: string) => (lang === "it" ? it : en);
  const [msgs, setMsgs] = useState<Msgs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("chatbot_configs")
      .select("welcome_msg_it, welcome_msg_en, fallback_msg_it, fallback_msg_en")
      .eq("id", chatbotId)
      .single()
      .then(({ data }) => {
        if (data) {
          setMsgs({
            welcome_msg_it: data.welcome_msg_it || DEFAULTS.welcome_msg_it,
            welcome_msg_en: data.welcome_msg_en || DEFAULTS.welcome_msg_en,
            fallback_msg_it: data.fallback_msg_it || DEFAULTS.fallback_msg_it,
            fallback_msg_en: data.fallback_msg_en || DEFAULTS.fallback_msg_en,
          });
        }
        setLoading(false);
      });
  }, [chatbotId]);

  const set = (k: keyof Msgs, v: string) => setMsgs((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("chatbot_configs").update(msgs).eq("id", chatbotId);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: t("saved"), description: tl("Messaggi aggiornati", "Messages updated") });
  };

  if (loading) {
    return <div className="glass rounded-xl p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="glass rounded-xl p-6 space-y-5">
      <h3 className="font-semibold text-foreground">{tl("Messaggi del chatbot", "Chatbot messages")}</h3>

      <div className="space-y-3">
        <Label>{t("welcomeMessage")}</Label>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">🇮🇹 {t("Welcome message (IT)", "Messaggio di benvenuto (IT)")}</Label>
          <Textarea value={msgs.welcome_msg_it} onChange={(e) => set("welcome_msg_it", e.target.value)} placeholder="Ciao! Come posso aiutarti?" rows={2} className="bg-secondary border-border resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">🇬🇧 {t("Welcome message (EN)", "Messaggio di benvenuto (EN)")}</Label>
          <Textarea value={msgs.welcome_msg_en} onChange={(e) => set("welcome_msg_en", e.target.value)} placeholder="Hello! How can I help you?" rows={2} className="bg-secondary border-border resize-none" />
        </div>
      </div>

      <div className="pt-2 border-t border-border space-y-5">
        <h3 className="font-semibold text-foreground">{t("fallbackBehavior")}</h3>
        <div className="space-y-3">
          <Label>{t("fallbackMsgIt")}</Label>
          <Textarea value={msgs.fallback_msg_it} onChange={(e) => set("fallback_msg_it", e.target.value)} placeholder={DEFAULTS.fallback_msg_it} rows={3} className="bg-secondary border-border resize-none" />
        </div>
        <div className="space-y-3">
          <Label>{t("fallbackMsgEn")}</Label>
          <Textarea value={msgs.fallback_msg_en} onChange={(e) => set("fallback_msg_en", e.target.value)} placeholder={DEFAULTS.fallback_msg_en} rows={3} className="bg-secondary border-border resize-none" />
          <p className="text-xs text-muted-foreground">{t("fallbackDesc")}</p>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0 glow-sm gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {tl("Salva", "Save")}
      </Button>
    </div>
  );
};

export default BotMessagesCard;
