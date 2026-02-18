import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Save } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();
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
      toast({ title: "Settings saved!", description: "API keys have been securely stored." });
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
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>Agency Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage API keys and global configuration</p>
      </div>

      <div className="glass rounded-xl p-6 space-y-6 max-w-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">API Keys</h2>
            <p className="text-xs text-muted-foreground">Stored securely server-side. Never exposed to clients.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">OpenAI API Key</Label>
          <Input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-... (leave blank to keep current)"
            className="bg-secondary border-border font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">Used for AI chat responses. Get it from platform.openai.com</p>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Resend API Key</Label>
          <Input
            type="password"
            value={resendKey}
            onChange={(e) => setResendKey(e.target.value)}
            placeholder="re_... (leave blank to keep current)"
            className="bg-secondary border-border font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">Used for email notifications. Get it from resend.com</p>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="gradient-primary text-white border-0 w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <div className="glass rounded-xl p-6 max-w-lg">
        <h2 className="font-semibold text-foreground text-sm mb-3">AI Model</h2>
        <p className="text-sm text-muted-foreground">
          The platform uses <span className="text-primary font-medium">Lovable AI (Gemini 3 Flash Preview)</span> by default
          for chatbot responses — no OpenAI key needed. You can optionally configure your own OpenAI key above to use GPT-4o-mini instead.
        </p>
      </div>
    </div>
  );
};

export default AdminSettings;
