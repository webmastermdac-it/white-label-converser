import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Bot, Palette, MessageSquare, Zap, Mail, SendHorizonal } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Config {
  id?: string;
  name: string;
  avatar: string;
  business_vertical: string;
  primary_color: string;
  background_color: string;
  text_color: string;
  welcome_message: string;
  welcome_msg_it: string;
  welcome_msg_en: string;
  fallback_message: string;
  fallback_msg_it: string;
  fallback_msg_en: string;
  calendly_url: string;
  notification_email: string;
  email_notifications_enabled: boolean;
  launcher_position: string;
  circle_color: string;
  embed_token?: string;
}


interface ChatbotConfigFormProps {
  clientId: string;
  chatbotId?: string;
  onSaved?: () => void;
}

const GENIE_ICON_URL = "/images/genius-icon.png";
const GENIE_AVATAR = "genie";
const GENIE_FULL_URL = "/images/genie-full.png";
const GENIE_FULL_AVATAR = "genie-full";
const IMAGE_AVATARS: Record<string, string> = {
  [GENIE_AVATAR]: GENIE_ICON_URL,
  [GENIE_FULL_AVATAR]: GENIE_FULL_URL,
};


const defaultConfig: Config = {
  name: "My Chatbot",
  avatar: GENIE_AVATAR,
  business_vertical: "general",
  primary_color: "#F59E0B",
  background_color: "#1A1A2E",
  text_color: "#FFFFFF",
  welcome_message: "Ciao! Come posso aiutarti oggi?",
  welcome_msg_it: "Ciao! Come posso aiutarti?",
  welcome_msg_en: "Hello! How can I help you?",
  fallback_message: "Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!",
  fallback_msg_it: "Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!",
  fallback_msg_en: "I don't have this information, but I can connect you with one of our consultants!",
  calendly_url: "",
  notification_email: "",
  email_notifications_enabled: true,
  launcher_position: "bottom-right",
  circle_color: "#F5A623",
};

const EMOJIS = [GENIE_AVATAR, GENIE_FULL_AVATAR, "🤖", "💬", "✨", "🎯", "🚀", "💡", "🤝", "⭐", "🌟", "🎪", "💖", "💕", "💗", "💝", "🌸", "🌷", "🌹", "🦋", "👩", "👩‍💼", "💄", "👜", "🛍️", "💅", "👑", "🎀", "🧚", "🪄", "🦄", "🌙", "🌛", "🌜", "🌚", "🌝"];
const CIRCLE_PRESETS = ["#F5A623", "#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#EF4444"];
const POSITIONS = ["bottom-right", "bottom-left"];
const VERTICALS = [
  { value: "ecommerce", emoji: "🛒", it: "Ecommerce / Vendita prodotti", en: "Ecommerce / Product sales" },
  { value: "booking", emoji: "📅", it: "Servizi su appuntamento", en: "Appointment-based services" },
  { value: "general", emoji: "💬", it: "Generico / Assistenza clienti", en: "General / Customer support" },
];


const ChatbotConfigForm: React.FC<ChatbotConfigFormProps> = ({ clientId, chatbotId: overrideChatbotId, onSaved }) => {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [activeSection, setActiveSection] = useState("identity");

  useEffect(() => {
    const fetchConfig = async () => {
      let query = supabase.from("chatbot_configs").select("*");
      if (overrideChatbotId) {
        query = query.eq("id", overrideChatbotId);
      } else {
        query = query.eq("client_id", clientId);
      }
      const { data } = await query.limit(1).single();

      if (data) {
        setConfig({
          id: data.id,
          name: data.name,
          avatar: data.avatar || "🤖",
          business_vertical: (data as any).business_vertical || "general",
          primary_color: data.primary_color || "#E94560",
          background_color: data.background_color || "#1A1A2E",
          text_color: data.text_color || "#FFFFFF",
          welcome_message: data.welcome_message || "",
          welcome_msg_it: data.welcome_msg_it || defaultConfig.welcome_msg_it,
          welcome_msg_en: data.welcome_msg_en || defaultConfig.welcome_msg_en,
          fallback_message: data.fallback_message || "",
          fallback_msg_it: data.fallback_msg_it || defaultConfig.fallback_msg_it,
          fallback_msg_en: data.fallback_msg_en || defaultConfig.fallback_msg_en,
          calendly_url: data.calendly_url || "",
          notification_email: data.notification_email || "",
          email_notifications_enabled: data.email_notifications_enabled ?? true,
          launcher_position: data.launcher_position || "bottom-right",
          circle_color: (data as any).circle_color || "#F5A623",
          embed_token: data.embed_token,
        });
      }

      setLoading(false);
    };

    fetchConfig();
  }, [clientId]);

  const save = async () => {
    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from("chatbot_configs")
          .update({
            name: config.name,
            avatar: config.avatar,
            business_vertical: config.business_vertical,
            primary_color: config.primary_color,
            background_color: config.background_color,
            text_color: config.text_color,
            welcome_message: config.welcome_message,
            welcome_msg_it: config.welcome_msg_it,
            welcome_msg_en: config.welcome_msg_en,
            fallback_message: config.fallback_message,
            fallback_msg_it: config.fallback_msg_it,
            fallback_msg_en: config.fallback_msg_en,
            calendly_url: config.calendly_url,
            notification_email: config.notification_email,
            email_notifications_enabled: config.email_notifications_enabled,
            launcher_position: config.launcher_position,
            circle_color: config.circle_color,
          } as any)
          .eq("id", config.id);

        if (error) {
          console.error("[ChatbotConfigForm] Save error:", error);
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("chatbot_configs")
          .insert({ ...config, client_id: clientId })
          .select()
          .single();

        if (error) throw error;
        setConfig((prev) => ({ ...prev, id: data.id, embed_token: data.embed_token }));
      }

      toast({ title: t("saved"), description: t("configUpdated") });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const set = (key: keyof Config, value: any) => setConfig((prev) => ({ ...prev, [key]: value }));

  const sections = [
    { id: "identity", label: t("identity"), icon: Bot },
    { id: "appearance", label: t("appearance"), icon: Palette },
    { id: "messages", label: t("chatMessages"), icon: MessageSquare },
    { id: "fallback", label: t("fallbackAndLeads"), icon: Zap },
    { id: "notifications", label: t("notifications"), icon: Mail },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 flex-wrap overflow-x-auto -mx-1 px-1 pb-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-all duration-150 min-h-[44px] whitespace-nowrap ${
              activeSection === s.id
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <s.icon className="w-4 h-4 md:w-3.5 md:h-3.5" />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Identity */}
      {activeSection === "identity" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">{t("identity")}</h3>

          <div className="space-y-2">
            <Label>{t("botName")}</Label>
            <Input
              value={config.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My Assistant"
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>{lang === "it" ? "Tipo di attività" : "Business type"}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {VERTICALS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => set("business_vertical", v.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-center transition-all ${
                    config.business_vertical === v.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="text-xs font-medium">{lang === "it" ? v.it : v.en}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {lang === "it"
                ? "Serve a consigliarti le integrazioni più pertinenti."
                : "Used to suggest the most relevant integrations for you."}
            </p>
          </div>



          <div className="space-y-2">
            <Label>{t("avatarEmoji")}</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => set("avatar", emoji)}
                  className={`w-10 h-10 text-xl flex items-center justify-center transition-all ${
                    IMAGE_AVATARS[emoji] ? "rounded-full bg-transparent" : "rounded-lg"
                  } ${
                    config.avatar === emoji
                      ? IMAGE_AVATARS[emoji]
                        ? "ring-2 ring-primary"
                        : "bg-primary/20 ring-2 ring-primary"
                      : IMAGE_AVATARS[emoji]
                        ? "hover:ring-1 hover:ring-primary/40"
                        : "bg-secondary hover:bg-accent"
                  }`}
                >
                  {IMAGE_AVATARS[emoji] ? (
                    <img src={IMAGE_AVATARS[emoji]} alt="Genius" className="w-9 h-9 object-contain" />
                  ) : (
                    emoji
                  )}

                </button>
              ))}

            </div>
          </div>

          {config.avatar === GENIE_FULL_AVATAR && (
            <div className="space-y-2">
              <Label>{lang === "it" ? "Colore del cerchio" : "Circle color"}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.circle_color}
                  onChange={(e) => set("circle_color", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={config.circle_color}
                  onChange={(e) => set("circle_color", e.target.value)}
                  className="bg-secondary border-border font-mono text-sm max-w-32"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {CIRCLE_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("circle_color", c)}
                    aria-label={c}
                    className={`w-8 h-8 rounded-full border border-border transition-all ${
                      config.circle_color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4 pt-2">
                <span className="relative inline-flex w-14 h-14 items-center justify-center shrink-0">
                  <span
                    className="absolute inset-[-8px] rounded-full animate-genie-glow"
                    style={{ background: `radial-gradient(circle, ${config.circle_color}d9 0%, ${config.circle_color}59 45%, transparent 70%)` }}
                  />
                  <span className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: config.circle_color }}>
                    <img src={GENIE_FULL_URL} alt="Genius" className="w-[83%] h-[83%] object-contain" />
                  </span>
                </span>
                <p className="text-xs text-muted-foreground">
                  {lang === "it" ? "Anteprima del pulsante chat con bagliore pulsante." : "Chat launcher preview with pulsing glow."}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("launcherPosition")}</Label>
            <div className="flex gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => set("launcher_position", pos)}
                  className={`flex-1 px-4 py-3 md:py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                    config.launcher_position === pos
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appearance */}
      {activeSection === "appearance" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">{t("brandColors")}</h3>

          {[
            { label: t("primaryColor"), key: "primary_color" as keyof Config },
            { label: t("backgroundColor"), key: "background_color" as keyof Config },
            { label: t("textColor"), key: "text_color" as keyof Config },
          ].map(({ label, key }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={config[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                  className="bg-secondary border-border font-mono text-sm max-w-32"
                />
                <div
                  className="w-10 h-10 rounded-lg border border-border"
                  style={{ backgroundColor: config[key] as string }}
                />
              </div>
            </div>
          ))}

          {/* Preview */}
          <div className="mt-4 p-4 rounded-xl border border-border" style={{ backgroundColor: config.background_color }}>
            <div className="flex items-center gap-3 mb-3">
              {IMAGE_AVATARS[config.avatar] ? (
                <span className="relative inline-flex w-12 h-12 items-center justify-center shrink-0">
                  <span
                    className="absolute inset-[-8px] rounded-full animate-genie-glow"
                    style={{ background: `radial-gradient(circle, ${config.primary_color}cc 0%, ${config.primary_color}40 45%, transparent 70%)` }}
                  />
                  <img src={IMAGE_AVATARS[config.avatar]} alt="Genius" className="relative z-10 w-12 h-12 object-contain" />
                </span>
              ) : (
                <span className="text-2xl leading-none">{config.avatar}</span>
              )}


              <span className="font-medium" style={{ color: config.text_color }}>{config.name}</span>
            </div>
            <div className="text-xs px-3 py-2 rounded-xl inline-block" style={{ backgroundColor: config.primary_color, color: "#fff" }}>
              {t("chatPreview")}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {activeSection === "messages" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">{t("chatMessages")}</h3>

          <div className="space-y-3">
            <Label>{t("welcomeMessage")}</Label>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">🇮🇹 {t("Welcome message (IT)", "Messaggio di benvenuto (IT)")}</Label>
                <Textarea
                  value={config.welcome_msg_it}
                  onChange={(e) => set("welcome_msg_it", e.target.value)}
                  placeholder="Ciao! Come posso aiutarti?"
                  rows={2}
                  className="bg-secondary border-border resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">🇬🇧 {t("Welcome message (EN)", "Messaggio di benvenuto (EN)")}</Label>
                <Textarea
                  value={config.welcome_msg_en}
                  onChange={(e) => set("welcome_msg_en", e.target.value)}
                  placeholder="Hello! How can I help you?"
                  rows={2}
                  className="bg-secondary border-border resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback */}
      {activeSection === "fallback" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">{t("fallbackBehavior")}</h3>

          <div className="space-y-3">
            <Label>{t("fallbackMsgIt")}</Label>
            <Textarea
              value={config.fallback_msg_it}
              onChange={(e) => set("fallback_msg_it", e.target.value)}
              placeholder="Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!"
              rows={3}
              className="bg-secondary border-border resize-none"
            />
          </div>

          <div className="space-y-3">
            <Label>{t("fallbackMsgEn")}</Label>
            <Textarea
              value={config.fallback_msg_en}
              onChange={(e) => set("fallback_msg_en", e.target.value)}
              placeholder="I don't have this information, but I can connect you with one of our consultants!"
              rows={3}
              className="bg-secondary border-border resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {t("fallbackDesc")}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("calendlyUrl")}</Label>
            <Input
              value={config.calendly_url}
              onChange={(e) => set("calendly_url", e.target.value)}
              placeholder="https://calendly.com/yourname/30min"
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground">
              {t("calendlyDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeSection === "notifications" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">{t("emailNotifications")}</h3>

          <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
            <div>
              <p className="text-sm font-medium text-foreground">{t("enableEmailNotifs")}</p>
              <p className="text-xs text-muted-foreground">{t("sendEmailOnLead")}</p>
            </div>
            <Switch
              checked={config.email_notifications_enabled}
              onCheckedChange={(v) => set("email_notifications_enabled", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("notificationEmail")}</Label>
            <Input
              type="email"
              value={config.notification_email}
              onChange={(e) => set("notification_email", e.target.value)}
              placeholder="leads@yourcompany.com"
              className="bg-secondary border-border"
            />
          </div>

          {config.notification_email && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              disabled={sendingTest}
              onClick={async () => {
                setSendingTest(true);
                try {
                  const { data, error } = await supabase.functions.invoke("send-test-email", {
                    body: { to_email: config.notification_email, bot_name: config.name },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  toast({ title: "✅ Email di test inviata!", description: `Controlla ${config.notification_email}` });
                } catch (err: any) {
                  toast({ title: "Errore invio email", description: err.message, variant: "destructive" });
                }
                setSendingTest(false);
              }}
            >
              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <SendHorizonal className="w-4 h-4 mr-2" />}
              Invia email di test
            </Button>
          )}
        </div>
      )}

      {/* Save */}
      <div className="sticky bottom-0 md:static bg-background/80 backdrop-blur-sm py-3 md:py-0 -mx-4 px-4 md:mx-0 md:px-0 border-t border-border md:border-0">
        <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0 glow-sm w-full md:w-auto h-12 md:h-10">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {t("saveConfig")}
        </Button>
      </div>
    </div>
  );
};

export default ChatbotConfigForm;
