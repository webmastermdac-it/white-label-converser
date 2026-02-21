import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Save } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [resendKey, setResendKey] = useState("");

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("save-settings", {
        body: { openai_key: openaiKey, resend_key: resendKey }
      });
      if (error) throw error;
      toast({ title: t("settingsSaved") });
      setOpenaiKey("");
      setResendKey("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{t("agencySettings")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("manageApiKeys")}</p>
      </div>

      <div className="glass rounded-xl p-6 space-y-6 max-w-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">{t("apiKeys")}</h2>
            <p className="text-xs text-muted-foreground">{t("storedSecurely")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">OpenAI API Key</Label>
          <Input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder={`sk-... (${t("leaveBlank")})`} className="bg-secondary border-border font-mono text-sm" />
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Resend API Key</Label>
          <Input type="password" value={resendKey} onChange={(e) => setResendKey(e.target.value)} placeholder={`re_... (${t("leaveBlank")})`} className="bg-secondary border-border font-mono text-sm" />
        </div>

        <Button onClick={saveSettings} disabled={saving} className="gradient-primary text-white border-0 w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {t("saveSettings")}
        </Button>
      </div>

      <div className="glass rounded-xl p-6 max-w-lg">
        <h2 className="font-semibold text-foreground text-sm mb-3">{t("aiModel")}</h2>
        <p className="text-sm text-muted-foreground">
          The platform uses <span className="text-primary font-medium">Lovable AI (Gemini 3 Flash Preview)</span> by default.
        </p>
      </div>
    </div>
  );
};

export default AdminSettings;
