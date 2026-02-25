import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Mail, Edit, Eye, Save, RotateCcw, Loader2, Send,
  Monitor, Smartphone, Clock, ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Default templates ──
const DEFAULT_TEMPLATES: Record<string, { subject: string; html_body: string; label: string; icon: string; variables: string[] }> = {
  welcome: {
    label: "Benvenuto / Registrazione",
    icon: "✉️",
    variables: ["{{nome}}", "{{email}}", "{{link}}", "{{app_name}}", "{{logo_url}}", "{{password}}"],
    subject: "Benvenuto/a in {{app_name}}! 👋",
    html_body: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Benvenuto/a, {{nome}}! 👋</h1>
<p style="margin:0 0 20px;font-size:14px;color:#888888;">Il tuo account è stato creato con successo</p>
<p style="margin:0 0 16px;">Siamo felici di averti a bordo. Il tuo chatbot è pronto per essere configurato: personalizzalo, aggiungi la tua knowledge base e inizia a catturare lead in automatico.</p>
<div style="background:#F5F5F5;border-radius:8px;padding:16px;margin:0 0 8px;">
  <p style="margin:0 0 6px;font-size:14px;">📧 <strong>Email:</strong> {{email}}</p>
</div>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Accedi alla piattaforma</a>
</div>`,
  },
  reset_password: {
    label: "Reset Password",
    icon: "🔑",
    variables: ["{{link}}", "{{app_name}}", "{{logo_url}}"],
    subject: "Reimposta la tua password - {{app_name}}",
    html_body: `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1A1A;">Reimposta la tua password</h1>
<p style="margin:0 0 16px;">Hai richiesto di reimpostare la password del tuo account. Clicca sul pulsante qui sotto per scegliere una nuova password.</p>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Reimposta password</a>
</div>
<p style="margin:20px 0 0;font-size:12px;color:#888888;">Il link scade tra 24 ore. Se non hai fatto tu questa richiesta, ignora questa email.</p>`,
  },
  chatbot_notification: {
    label: "Notifica Chatbot",
    icon: "💬",
    variables: ["{{nome}}", "{{email}}", "{{messaggio}}", "{{data}}", "{{link}}", "{{app_name}}", "{{logo_url}}", "{{bot_name}}"],
    subject: "🔔 Nuovo Lead: {{nome}} - {{bot_name}}",
    html_body: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Hai ricevuto un nuovo messaggio 💬</h1>
<p style="margin:0 0 20px;font-size:14px;color:#888888;">{{bot_name}}</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  <tr><td style="padding:10px 0;color:#888888;font-size:13px;width:90px;">Nome</td><td style="padding:10px 0;font-weight:600;font-size:14px;">{{nome}}</td></tr>
  <tr><td style="padding:10px 0;color:#888888;font-size:13px;">Email</td><td style="padding:10px 0;font-size:14px;">{{email}}</td></tr>
  <tr><td style="padding:10px 0;color:#888888;font-size:13px;">Messaggio</td><td style="padding:10px 0;font-size:14px;">{{messaggio}}</td></tr>
  <tr><td style="padding:10px 0;color:#888888;font-size:13px;">Data</td><td style="padding:10px 0;font-size:13px;color:#888888;">{{data}}</td></tr>
</table>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Visualizza conversazione</a>
</div>`,
  },
  weekly_summary: {
    label: "Riepilogo Settimanale",
    icon: "📊",
    variables: ["{{totale_conversazioni}}", "{{messaggi_ricevuti}}", "{{tempo_medio}}", "{{link}}", "{{app_name}}", "{{logo_url}}"],
    subject: "Il tuo riepilogo settimanale - {{app_name}}",
    html_body: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Riepilogo conversazioni 📊</h1>
<p style="margin:0 0 24px;font-size:14px;color:#888888;">Il tuo riepilogo settimanale</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
  <thead>
    <tr style="border-bottom:2px solid #E5E5E5;">
      <th style="text-align:left;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Metrica</th>
      <th style="text-align:right;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Valore</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid #E5E5E5;">
      <td style="padding:14px 8px;font-size:14px;">Totale conversazioni</td>
      <td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{totale_conversazioni}}</td>
    </tr>
    <tr style="border-bottom:1px solid #E5E5E5;">
      <td style="padding:14px 8px;font-size:14px;">Messaggi ricevuti</td>
      <td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{messaggi_ricevuti}}</td>
    </tr>
    <tr>
      <td style="padding:14px 8px;font-size:14px;">Tempo medio di risposta</td>
      <td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{tempo_medio}}</td>
    </tr>
  </tbody>
</table>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Vedi tutte le conversazioni</a>
</div>`,
  },
};

// Sanitize HTML to prevent XSS (basic but effective for email context)
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "");
}

interface TemplateRow {
  id: string;
  type: string;
  subject: string;
  html_body: string;
  updated_at: string;
  updated_by: string | null;
}

const AdminEmailTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Record<string, TemplateRow | null>>({});
  const [loading, setLoading] = useState(true);
  const [editType, setEditType] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Brand settings for preview
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandAppName, setBrandAppName] = useState("Genius Chatbot");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#1A1A1A");
  const [brandFooterText, setBrandFooterText] = useState("Genius Chatbot Builder — Un prodotto MDAC S.r.l.");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("email_templates" as any).select("*");
    const map: Record<string, TemplateRow | null> = {};
    for (const type of Object.keys(DEFAULT_TEMPLATES)) {
      const found = (data as any[])?.find((d: any) => d.type === type);
      map[type] = found || null;
    }
    setTemplates(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
    // Load brand settings
    supabase.from("brand_settings" as any).select("*").limit(1).single().then(({ data }) => {
      if (data) {
        const d = data as any;
        setBrandLogoUrl(d.logo_url);
        setBrandAppName(d.app_name || "Genius Chatbot");
        setBrandPrimaryColor(d.primary_color || "#1A1A1A");
        setBrandFooterText(d.footer_text || "");
      }
    });
  }, [fetchTemplates]);

  const getEffective = (type: string) => {
    const custom = templates[type];
    const def = DEFAULT_TEMPLATES[type];
    return {
      subject: custom?.subject || def.subject,
      html_body: custom?.html_body || def.html_body,
      isCustom: !!custom,
      updated_at: custom?.updated_at,
    };
  };

  const openEditor = (type: string) => {
    const eff = getEffective(type);
    setEditSubject(eff.subject);
    setEditBody(eff.html_body);
    setEditType(type);
  };

  const insertVariable = (variable: string) => {
    setEditBody((prev) => prev + variable);
  };

  const saveTemplate = async () => {
    if (!editType || !user) return;
    setSaving(true);
    try {
      const sanitizedBody = sanitizeHtml(editBody);
      const existing = templates[editType];

      if (existing) {
        // Log the change
        await supabase.from("email_template_logs" as any).insert({
          template_id: existing.id,
          template_type: editType,
          changed_by: user.id,
          old_subject: existing.subject,
          new_subject: editSubject,
          old_html_body: existing.html_body,
          new_html_body: sanitizedBody,
        } as any);

        await supabase.from("email_templates" as any).update({
          subject: editSubject,
          html_body: sanitizedBody,
          updated_by: user.id,
        } as any).eq("id", existing.id);
      } else {
        const { data: inserted } = await supabase.from("email_templates" as any).insert({
          type: editType,
          subject: editSubject,
          html_body: sanitizedBody,
          updated_by: user.id,
        } as any).select().single();

        if (inserted) {
          await supabase.from("email_template_logs" as any).insert({
            template_id: (inserted as any).id,
            template_type: editType,
            changed_by: user.id,
            old_subject: DEFAULT_TEMPLATES[editType].subject,
            new_subject: editSubject,
            old_html_body: DEFAULT_TEMPLATES[editType].html_body,
            new_html_body: sanitizedBody,
          } as any);
        }
      }

      toast({ title: "Template salvato!" });
      await fetchTemplates();
      setEditType(null);
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const restoreDefault = async (type: string) => {
    const existing = templates[type];
    if (!existing) return;
    try {
      await supabase.from("email_templates" as any).delete().eq("id", existing.id);
      toast({ title: "Template ripristinato ai valori predefiniti" });
      await fetchTemplates();
      setEditType(null);
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  const renderPreview = (type: string) => {
    const eff = getEffective(type);
    // Replace variables with sample data
    let html = eff.html_body
      .replace(/\{\{nome\}\}/g, "Mario Rossi")
      .replace(/\{\{email\}\}/g, "mario@example.com")
      .replace(/\{\{link\}\}/g, "#")
      .replace(/\{\{app_name\}\}/g, brandAppName)
      .replace(/\{\{logo_url\}\}/g, brandLogoUrl || "")
      .replace(/\{\{password\}\}/g, "••••••••")
      .replace(/\{\{bot_name\}\}/g, "My Chatbot")
      .replace(/\{\{messaggio\}\}/g, "Vorrei sapere di più sui vostri servizi...")
      .replace(/\{\{data\}\}/g, new Date().toLocaleString("it-IT"))
      .replace(/\{\{totale_conversazioni\}\}/g, "142")
      .replace(/\{\{messaggi_ricevuti\}\}/g, "1,024")
      .replace(/\{\{tempo_medio\}\}/g, "< 2 min");

    // Replace primary color in CTA buttons
    html = html.replace(/background:#1A1A1A/g, `background:${brandPrimaryColor}`);

    const logoSection = brandLogoUrl
      ? `<img src="${brandLogoUrl}" alt="${brandAppName}" style="max-height:60px;max-width:200px;display:block;margin:0 auto 32px;" />`
      : `<div style="text-align:center;margin-bottom:32px;font-size:22px;font-weight:700;color:#1A1A1A;">${brandAppName}</div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:40px 40px 0 40px;">${logoSection}</td></tr>
    <tr><td style="padding:0 40px 40px 40px;color:#1A1A1A;font-size:15px;line-height:1.6;">${html}</td></tr>
    <tr><td style="padding:20px 40px;border-top:1px solid #E5E5E5;">
      <p style="margin:0;font-size:12px;color:#888888;text-align:center;">${brandFooterText}</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
  };

  const sendTestEmail = async (type: string) => {
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: { to_email: user?.email, bot_name: brandAppName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅ Email di test inviata!", description: `Controlla ${user?.email}` });
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
    setSendingTest(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
          <Mail className="w-6 h-6 inline-block mr-2 -mt-1" />
          Email & Notifiche
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gestisci i template delle email transazionali</p>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(DEFAULT_TEMPLATES).map(([type, def]) => {
          const eff = getEffective(type);
          return (
            <div key={type} className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{def.icon}</span>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{def.label}</h3>
                    {eff.isCustom ? (
                      <Badge variant="secondary" className="text-xs mt-1">Personalizzato</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs mt-1">Default</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Oggetto:</p>
                <p className="text-sm text-foreground truncate">{eff.subject}</p>
              </div>

              {eff.updated_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Modificato: {new Date(eff.updated_at).toLocaleDateString("it-IT")}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => openEditor(type)} className="flex-1">
                  <Edit className="w-3.5 h-3.5 mr-1" /> Modifica
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewType(type)} className="flex-1">
                  <Eye className="w-3.5 h-3.5 mr-1" /> Anteprima
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Dialog */}
      <Dialog open={!!editType} onOpenChange={(open) => !open && setEditType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Modifica: {editType && DEFAULT_TEMPLATES[editType]?.label}
            </DialogTitle>
            <DialogDescription>
              Modifica l'oggetto e il corpo HTML del template. Usa le variabili per il contenuto dinamico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Oggetto email</Label>
              <Input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="bg-secondary border-border text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Variabili disponibili</Label>
              <div className="flex flex-wrap gap-1.5">
                {editType && DEFAULT_TEMPLATES[editType]?.variables.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Corpo email (HTML)</Label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="bg-secondary border-border text-sm font-mono min-h-[300px]"
                placeholder="<h1>...</h1>"
              />
            </div>

            <div className="flex gap-2 justify-between">
              <div>
                {editType && templates[editType] && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Ripristina default
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ripristinare il template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le personalizzazioni verranno eliminate e il template tornerà ai valori predefiniti.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => editType && restoreDefault(editType)}>
                          Ripristina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditType(null)}>Annulla</Button>
                <Button onClick={saveTemplate} disabled={saving} className="gradient-primary text-white border-0">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Salva modifiche
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewType} onOpenChange={(open) => !open && setPreviewType(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Anteprima: {previewType && DEFAULT_TEMPLATES[previewType]?.label}
            </DialogTitle>
            <DialogDescription>
              Visualizza come apparirà l'email al destinatario finale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Toggle + send test */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    previewMode === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    previewMode === "mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewType && sendTestEmail(previewType)}
                disabled={sendingTest}
              >
                {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Invia email di test
              </Button>
            </div>

            {/* Subject preview */}
            {previewType && (
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Oggetto:</p>
                <p className="text-sm font-medium text-foreground">
                  {getEffective(previewType).subject
                    .replace(/\{\{app_name\}\}/g, brandAppName)
                    .replace(/\{\{nome\}\}/g, "Mario Rossi")
                    .replace(/\{\{bot_name\}\}/g, "My Chatbot")}
                </p>
              </div>
            )}

            {/* Email render */}
            <div
              className="border border-border rounded-xl overflow-hidden bg-[#F5F5F5] mx-auto transition-all duration-300"
              style={{ maxWidth: previewMode === "mobile" ? 375 : "100%" }}
            >
              {previewType && (
                <iframe
                  srcDoc={renderPreview(previewType)}
                  className="w-full border-0"
                  style={{ height: previewMode === "mobile" ? 600 : 500 }}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailTemplates;
