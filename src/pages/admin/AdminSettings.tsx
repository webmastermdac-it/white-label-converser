import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Save, Mail, Upload, Palette, X } from "lucide-react";
import AIConfigSection from "@/components/admin/AIConfigSection";

const AdminSettings = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [resendKey, setResendKey] = useState("");

  // Brand settings
  const [brandId, setBrandId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [appName, setAppName] = useState("Genius Chatbot");
  const [primaryColor, setPrimaryColor] = useState("#1A1A1A");
  const [footerText, setFooterText] = useState("Genius Chatbot Builder — Un prodotto MDAC S.r.l.");
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadBrandSettings();
  }, []);

  const loadBrandSettings = async () => {
    const { data } = await supabase
      .from("brand_settings" as any)
      .select("*")
      .limit(1)
      .single();
    if (data) {
      const d = data as any;
      setBrandId(d.id);
      setLogoUrl(d.logo_url);
      setAppName(d.app_name || "Genius Chatbot");
      setPrimaryColor(d.primary_color || "#1A1A1A");
      setFooterText(d.footer_text || "");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo.${ext}`;
      // Remove old logo
      await supabase.storage.from("brand-assets").remove([path]);
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setLogoUrl(urlData.publicUrl + "?t=" + Date.now());
      toast({ title: "Logo caricato!" });
    } catch (err: any) {
      toast({ title: "Errore upload", description: err.message, variant: "destructive" });
    }
    setUploadingLogo(false);
  };

  const removeLogo = () => setLogoUrl(null);

  const saveBrandSettings = async () => {
    setSavingBrand(true);
    try {
      const payload = { logo_url: logoUrl, app_name: appName, primary_color: primaryColor, footer_text: footerText };
      if (brandId) {
        const { error } = await supabase.from("brand_settings" as any).update(payload as any).eq("id", brandId);
        if (error) throw error;
      }
      toast({ title: "Brand salvato!" });
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setSavingBrand(false);
  };

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

      {/* Brand Settings */}
      <div className="glass rounded-xl p-6 space-y-6 max-w-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Brand & Email</h2>
            <p className="text-xs text-muted-foreground">Logo, colori e footer per le email transazionali</p>
          </div>
        </div>

        {/* Logo upload */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Logo aziendale</Label>
          {logoUrl ? (
            <div className="flex items-center gap-3">
              <div className="border border-border rounded-lg p-3 bg-secondary">
                <img src={logoUrl} alt="Logo" style={{ maxHeight: 60, maxWidth: 200 }} />
              </div>
              <Button variant="ghost" size="icon" onClick={removeLogo}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Nessun logo caricato</p>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploadingLogo} asChild>
                  <span>
                    {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                    Carica logo
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Nome app</Label>
          <Input value={appName} onChange={(e) => setAppName(e.target.value)} className="bg-secondary border-border text-sm" />
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Colore primario (email CTA)</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="bg-secondary border-border text-sm font-mono w-28" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Testo footer email</Label>
          <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} className="bg-secondary border-border text-sm" />
        </div>

        <Button onClick={saveBrandSettings} disabled={savingBrand} className="gradient-primary text-white border-0 w-full">
          {savingBrand ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salva Brand
        </Button>
      </div>

      {/* API Keys */}
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

        <div className="border-t border-border pt-4 mt-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Test Notifiche Email</h3>
          <p className="text-xs text-muted-foreground mb-3">Invia un'email di test per verificare template e configurazione Resend.</p>
          <Button
            variant="outline"
            onClick={async () => {
              setSendingTest(true);
              try {
                const { data, error } = await supabase.functions.invoke("send-test-email", {
                  body: { to_email: "developermdac@gmail.com", bot_name: appName }
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
                toast({ title: "✅ Email inviata!", description: "Controlla la casella developermdac@gmail.com" });
              } catch (err: any) {
                toast({ title: "Errore invio email", description: err.message, variant: "destructive" });
              }
              setSendingTest(false);
            }}
            disabled={sendingTest}
            className="w-full border-border text-foreground"
          >
            {sendingTest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
            Invia Email di Test
          </Button>
        </div>
      </div>

      <AIConfigSection />
    </div>
  );
};

export default AdminSettings;
