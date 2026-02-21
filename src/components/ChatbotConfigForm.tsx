import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Bot, Palette, MessageSquare, Zap, Mail, Star } from "lucide-react";
import KnowledgeBaseWizard from "@/components/knowledge-base/KnowledgeBaseWizard";

interface Config {
  id?: string;
  name: string;
  avatar: string;
  primary_color: string;
  background_color: string;
  text_color: string;
  welcome_message: string;
  knowledge_base: string;
  fallback_message: string;
  calendly_url: string;
  notification_email: string;
  email_notifications_enabled: boolean;
  launcher_position: string;
  embed_token?: string;
}

interface ChatbotConfigFormProps {
  clientId: string;
  onSaved?: () => void;
}

const defaultConfig: Config = {
  name: "My Chatbot",
  avatar: "🤖",
  primary_color: "#E94560",
  background_color: "#1A1A2E",
  text_color: "#FFFFFF",
  welcome_message: "Ciao! Come posso aiutarti oggi?",
  knowledge_base: "",
  fallback_message: "Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!",
  calendly_url: "",
  notification_email: "",
  email_notifications_enabled: true,
  launcher_position: "bottom-right",
};

const EMOJIS = ["🤖", "💬", "✨", "🎯", "🚀", "💡", "🤝", "⭐", "🌟", "🎪"];
const POSITIONS = ["bottom-right", "bottom-left"];

const ChatbotConfigForm: React.FC<ChatbotConfigFormProps> = ({ clientId, onSaved }) => {
  const { toast } = useToast();
  const { role } = useAuth();
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("identity");
  const [clientPlan, setClientPlan] = useState<string>("free");

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("chatbot_configs")
        .select("*")
        .eq("client_id", clientId)
        .single();

      if (data) {
        setConfig({
          id: data.id,
          name: data.name,
          avatar: data.avatar || "🤖",
          primary_color: data.primary_color || "#E94560",
          background_color: data.background_color || "#1A1A2E",
          text_color: data.text_color || "#FFFFFF",
          welcome_message: data.welcome_message || "",
          knowledge_base: data.knowledge_base || "",
          fallback_message: data.fallback_message || "",
          calendly_url: data.calendly_url || "",
          notification_email: data.notification_email || "",
          email_notifications_enabled: data.email_notifications_enabled ?? true,
          launcher_position: data.launcher_position || "bottom-right",
          embed_token: data.embed_token,
        });
      }

      // Fetch client plan
      const { data: clientData } = await supabase
        .from("clients")
        .select("plan")
        .eq("id", clientId)
        .single();

      if (clientData) {
        setClientPlan(clientData.plan || "free");
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
            primary_color: config.primary_color,
            background_color: config.background_color,
            text_color: config.text_color,
            welcome_message: config.welcome_message,
            knowledge_base: config.knowledge_base,
            fallback_message: config.fallback_message,
            calendly_url: config.calendly_url,
            notification_email: config.notification_email,
            email_notifications_enabled: config.email_notifications_enabled,
            launcher_position: config.launcher_position,
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("chatbot_configs")
          .insert({ ...config, client_id: clientId })
          .select()
          .single();

        if (error) throw error;
        setConfig((prev) => ({ ...prev, id: data.id, embed_token: data.embed_token }));
      }

      toast({ title: "Saved!", description: "Chatbot configuration updated." });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const set = (key: keyof Config, value: any) => setConfig((prev) => ({ ...prev, [key]: value }));

  const isProOrAdmin = clientPlan === "pro" || role === "super_admin";

  const sections = [
    { id: "identity", label: "Identity", icon: Bot },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "fallback", label: "Fallback & Leads", icon: Zap },
    { id: "notifications", label: "Notifications", icon: Mail },
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
      <div className="flex gap-2 flex-wrap">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeSection === s.id
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Identity */}
      {activeSection === "identity" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">Bot Identity</h3>

          <div className="space-y-2">
            <Label>Bot Name</Label>
            <Input
              value={config.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My Assistant"
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Avatar (Emoji)</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => set("avatar", emoji)}
                  className={`w-10 h-10 text-xl rounded-lg transition-all ${
                    config.avatar === emoji
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-secondary hover:bg-accent"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Launcher Position</Label>
            <div className="flex gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => set("launcher_position", pos)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
          <h3 className="font-semibold text-foreground">Brand Colors</h3>

          {[
            { label: "Primary Color", key: "primary_color" as keyof Config },
            { label: "Background Color", key: "background_color" as keyof Config },
            { label: "Text Color", key: "text_color" as keyof Config },
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
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{config.avatar}</span>
              <span className="font-medium" style={{ color: config.text_color }}>{config.name}</span>
            </div>
            <div className="text-xs px-3 py-2 rounded-xl inline-block" style={{ backgroundColor: config.primary_color, color: "#fff" }}>
              Chat Preview
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {activeSection === "messages" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">Chat Messages</h3>

          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea
              value={config.welcome_message}
              onChange={(e) => set("welcome_message", e.target.value)}
              placeholder="Ciao! Come posso aiutarti oggi?"
              rows={3}
              className="bg-secondary border-border resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Knowledge Base / System Prompt
              <span className="ml-2 text-xs text-muted-foreground">(used as AI system prompt)</span>
            </Label>

            {isProOrAdmin && config.id ? (
              <KnowledgeBaseWizard
                clientId={clientId}
                configId={config.id}
                currentKnowledgeBase={config.knowledge_base}
                onSave={async (kb) => {
                  set("knowledge_base", kb);
                  const { error } = await supabase
                    .from("chatbot_configs")
                    .update({ knowledge_base: kb })
                    .eq("id", config.id);
                  if (error) {
                    toast({ title: "Errore", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Knowledge Base salvata!" });
                  }
                }}
              />
            ) : (
              <>
                {/* Upgrade banner for non-Pro users */}
                {!isProOrAdmin && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 mb-3">
                    <Star className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        ⭐ Upgrade a Pro per sbloccare il Wizard Knowledge Base
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Template per settore, upload documenti, analisi sito web e revisione guidata.
                      </p>
                      <a
                        href="/#pricing"
                        className="inline-block mt-2 text-xs font-medium text-primary hover:underline"
                      >
                        Upgrade to Pro →
                      </a>
                    </div>
                  </div>
                )}

                <Textarea
                  value={config.knowledge_base}
                  onChange={(e) => set("knowledge_base", e.target.value)}
                  placeholder={`Write everything the bot should know:\n\nCompany: Acme Corp\nServices: Web design, SEO, Social Media\nTone: professional but friendly\nFAQs:\n- Q: What are your prices? A: Starting from €500/month\n...\n\nForbidden topics: competitors, internal pricing`}
                  rows={14}
                  className="bg-secondary border-border resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This text becomes the AI's system prompt. The more detailed, the better the bot performs.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fallback */}
      {activeSection === "fallback" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">Fallback Behavior & Lead Capture</h3>

          <div className="space-y-2">
            <Label>Fallback Message</Label>
            <Textarea
              value={config.fallback_message}
              onChange={(e) => set("fallback_message", e.target.value)}
              placeholder="Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!"
              rows={3}
              className="bg-secondary border-border resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Shown when the AI doesn't know the answer. A lead capture form will appear automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Calendly URL (optional)</Label>
            <Input
              value={config.calendly_url}
              onChange={(e) => set("calendly_url", e.target.value)}
              placeholder="https://calendly.com/yourname/30min"
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground">
              When set, a "Book a Consultation" button appears after fallback.
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeSection === "notifications" && (
        <div className="glass rounded-xl p-6 space-y-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground">Email Notifications</h3>

          <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Email Notifications</p>
              <p className="text-xs text-muted-foreground">Send email on every new lead</p>
            </div>
            <Switch
              checked={config.email_notifications_enabled}
              onCheckedChange={(v) => set("email_notifications_enabled", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notification Email</Label>
            <Input
              type="email"
              value={config.notification_email}
              onChange={(e) => set("notification_email", e.target.value)}
              placeholder="leads@yourcompany.com"
              className="bg-secondary border-border"
            />
          </div>
        </div>
      )}

      {/* Save */}
      <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0 glow-sm">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Configuration
      </Button>
    </div>
  );
};

export default ChatbotConfigForm;
