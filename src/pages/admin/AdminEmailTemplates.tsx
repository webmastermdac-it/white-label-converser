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
  Monitor, Smartphone, Clock, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

type Locale = "it" | "en";

// Default templates per locale
const DEFAULT_TEMPLATES: Record<string, {
  label: Record<Locale, string>; icon: string; variables: string[];
  subject: Record<Locale, string>; html_body: Record<Locale, string>;
}> = {
  welcome: {
    label: { it: "Benvenuto / Registrazione", en: "Welcome / Registration" },
    icon: "✉️",
    variables: ["{{nome}}", "{{email}}", "{{link}}", "{{app_name}}", "{{logo_url}}", "{{password}}"],
    subject: {
      it: "Benvenuto/a in {{app_name}}! 👋",
      en: "Welcome to {{app_name}}! 🎉",
    },
    html_body: {
      it: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Benvenuto/a, {{nome}}! 👋</h1>
<p style="margin:0 0 20px;font-size:14px;color:#888888;">Il tuo account è stato creato con successo</p>
<p style="margin:0 0 16px;">Siamo felici di averti a bordo. Il tuo chatbot è pronto per essere configurato.</p>
<div style="background:#F5F5F5;border-radius:8px;padding:16px;margin:0 0 8px;">
  <p style="margin:0 0 6px;font-size:14px;">📧 <strong>Email:</strong> {{email}}</p>
</div>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Accedi alla piattaforma</a>
</div>`,
      en: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Welcome, {{nome}}! 👋</h1>
<p style="margin:0 0 20px;font-size:14px;color:#888888;">Your account has been created successfully</p>
<p style="margin:0 0 16px;">We're glad to have you on board. Your chatbot is ready to be configured.</p>
<div style="background:#F5F5F5;border-radius:8px;padding:16px;margin:0 0 8px;">
  <p style="margin:0 0 6px;font-size:14px;">📧 <strong>Email:</strong> {{email}}</p>
</div>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Access the platform</a>
</div>`,
    },
  },
  reset_password: {
    label: { it: "Reset Password", en: "Reset Password" },
    icon: "🔑",
    variables: ["{{link}}", "{{app_name}}", "{{logo_url}}"],
    subject: {
      it: "Reimposta la tua password - {{app_name}}",
      en: "Reset your password - {{app_name}}",
    },
    html_body: {
      it: `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1A1A;">Reimposta la tua password</h1>
<p style="margin:0 0 16px;">Hai richiesto di reimpostare la password. Clicca il pulsante qui sotto.</p>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Reimposta password</a>
</div>
<p style="margin:20px 0 0;font-size:12px;color:#888888;">Il link scade tra 24 ore. Se non hai fatto tu questa richiesta, ignora questa email.</p>`,
      en: `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1A1A;">Reset your password</h1>
<p style="margin:0 0 16px;">You requested to reset your password. Click the button below to choose a new password.</p>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Reset password</a>
</div>
<p style="margin:20px 0 0;font-size:12px;color:#888888;">This link expires in 24 hours. If you didn't request this, please ignore this email.</p>`,
    },
  },
  chatbot_notification: {
    label: { it: "Notifica Chatbot", en: "Chatbot Notification" },
    icon: "💬",
    variables: ["{{nome}}", "{{email}}", "{{messaggio}}", "{{data}}", "{{link}}", "{{app_name}}", "{{logo_url}}", "{{bot_name}}"],
    subject: {
      it: "🔔 Nuovo Lead: {{nome}} - {{bot_name}}",
      en: "🔔 New Lead: {{nome}} - {{bot_name}}",
    },
    html_body: {
      it: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Hai ricevuto un nuovo messaggio 💬</h1>
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
      en: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">You have a new message 💬</h1>
<p style="margin:0 0 20px;font-size:14px;color:#888888;">{{bot_name}}</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  <tr><td style="padding:10px 0;color:#888888;font-size:13px;width:90px;">Name</td><td style="padding:10px 0;font-weight:600;font-size:14px;">{{nome}}</td></tr>
  <tr><td style="padding:10px 0;color:#888888;font-size:13px;">Email</td><td style="padding:10px 0;font-size:14px;">{{email}}</td></tr>
  <tr><td style="padding:10px 0;color:#888888;font-size:13px;">Message</td><td style="padding:10px 0;font-size:14px;">{{messaggio}}</td></tr>
  <tr><td style="padding:10px 0;color:#888888;font-size:13px;">Date</td><td style="padding:10px 0;font-size:13px;color:#888888;">{{data}}</td></tr>
</table>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">View conversation</a>
</div>`,
    },
  },
  weekly_summary: {
    label: { it: "Riepilogo Settimanale", en: "Weekly Summary" },
    icon: "📊",
    variables: ["{{totale_conversazioni}}", "{{messaggi_ricevuti}}", "{{tempo_medio}}", "{{link}}", "{{app_name}}", "{{logo_url}}"],
    subject: {
      it: "Il tuo riepilogo settimanale - {{app_name}}",
      en: "Your weekly summary - {{app_name}}",
    },
    html_body: {
      it: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Riepilogo conversazioni 📊</h1>
<p style="margin:0 0 24px;font-size:14px;color:#888888;">Il tuo riepilogo settimanale</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
  <thead><tr style="border-bottom:2px solid #E5E5E5;">
    <th style="text-align:left;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Metrica</th>
    <th style="text-align:right;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Valore</th>
  </tr></thead>
  <tbody>
    <tr style="border-bottom:1px solid #E5E5E5;"><td style="padding:14px 8px;font-size:14px;">Totale conversazioni</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{totale_conversazioni}}</td></tr>
    <tr style="border-bottom:1px solid #E5E5E5;"><td style="padding:14px 8px;font-size:14px;">Messaggi ricevuti</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{messaggi_ricevuti}}</td></tr>
    <tr><td style="padding:14px 8px;font-size:14px;">Tempo medio di risposta</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{tempo_medio}}</td></tr>
  </tbody>
</table>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Vedi tutte le conversazioni</a>
</div>`,
      en: `<h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Conversations summary 📊</h1>
<p style="margin:0 0 24px;font-size:14px;color:#888888;">Your weekly summary</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
  <thead><tr style="border-bottom:2px solid #E5E5E5;">
    <th style="text-align:left;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Metric</th>
    <th style="text-align:right;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Value</th>
  </tr></thead>
  <tbody>
    <tr style="border-bottom:1px solid #E5E5E5;"><td style="padding:14px 8px;font-size:14px;">Total conversations</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{totale_conversazioni}}</td></tr>
    <tr style="border-bottom:1px solid #E5E5E5;"><td style="padding:14px 8px;font-size:14px;">Messages received</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{messaggi_ricevuti}}</td></tr>
    <tr><td style="padding:14px 8px;font-size:14px;">Avg. response time</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">{{tempo_medio}}</td></tr>
  </tbody>
</table>
<div style="text-align:center;margin:28px 0 0;">
  <a href="{{link}}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">View all conversations</a>
</div>`,
    },
  },
};

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "");
}

interface TemplateRow {
  id: string;
  type: string;
  locale: string;
  subject: string;
  html_body: string;
  updated_at: string;
  updated_by: string | null;
}

const AdminEmailTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>("it");
  const [editType, setEditType] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandAppName, setBrandAppName] = useState("Genius Chatbot");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#1A1A1A");
  const [brandFooterText, setBrandFooterText] = useState("Genius Chatbot Builder — Un prodotto MDAC S.r.l.");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("email_templates" as any).select("*");
    setTemplates((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
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

  const getCustom = (type: string, loc: Locale): TemplateRow | undefined =>
    templates.find((t) => t.type === type && t.locale === loc);

  const getEffective = (type: string, loc: Locale = locale) => {
    const custom = getCustom(type, loc);
    const def = DEFAULT_TEMPLATES[type];
    return {
      subject: custom?.subject || def.subject[loc],
      html_body: custom?.html_body || def.html_body[loc],
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
      const existing = getCustom(editType, locale);

      if (existing) {
        await supabase.from("email_template_logs" as any).insert({
          template_id: existing.id, template_type: editType, changed_by: user.id,
          old_subject: existing.subject, new_subject: editSubject,
          old_html_body: existing.html_body, new_html_body: sanitizedBody,
        } as any);
        await supabase.from("email_templates" as any).update({
          subject: editSubject, html_body: sanitizedBody, updated_by: user.id,
        } as any).eq("id", existing.id);
      } else {
        const { data: inserted } = await supabase.from("email_templates" as any).insert({
          type: editType, locale, subject: editSubject, html_body: sanitizedBody, updated_by: user.id,
        } as any).select().single();
        if (inserted) {
          await supabase.from("email_template_logs" as any).insert({
            template_id: (inserted as any).id, template_type: editType, changed_by: user.id,
            old_subject: DEFAULT_TEMPLATES[editType].subject[locale],
            new_subject: editSubject,
            old_html_body: DEFAULT_TEMPLATES[editType].html_body[locale],
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
    const existing = getCustom(type, locale);
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
    let html = eff.html_body
      .replace(/\{\{nome\}\}/g, locale === "en" ? "John Smith" : "Mario Rossi")
      .replace(/\{\{email\}\}/g, locale === "en" ? "john@example.com" : "mario@example.com")
      .replace(/\{\{link\}\}/g, "#")
      .replace(/\{\{app_name\}\}/g, brandAppName)
      .replace(/\{\{logo_url\}\}/g, brandLogoUrl || "")
      .replace(/\{\{password\}\}/g, "••••••••")
      .replace(/\{\{bot_name\}\}/g, "My Chatbot")
      .replace(/\{\{messaggio\}\}/g, locale === "en" ? "I'd like to know more about your services..." : "Vorrei sapere di più sui vostri servizi...")
      .replace(/\{\{data\}\}/g, new Date().toLocaleString(locale === "en" ? "en-GB" : "it-IT"))
      .replace(/\{\{totale_conversazioni\}\}/g, "142")
      .replace(/\{\{messaggi_ricevuti\}\}/g, "1,024")
      .replace(/\{\{tempo_medio\}\}/g, "< 2 min");

    html = html.replace(/background:#1A1A1A/g, `background:${brandPrimaryColor}`);

    const logoSection = brandLogoUrl
      ? `<img src="${brandLogoUrl}" alt="${brandAppName}" style="max-height:60px;max-width:200px;display:block;margin:0 auto 32px;" />`
      : `<div style="text-align:center;margin-bottom:32px;font-size:22px;font-weight:700;color:#1A1A1A;">${brandAppName}</div>`;

    const footerHtml = locale === "en"
      ? `© 2025 <a href="https://mdac.agency" target="_blank" style="color:#888888;text-decoration:underline;">MDAC s.r.l.</a> — All rights reserved`
      : brandFooterText;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:40px 40px 0 40px;">${logoSection}</td></tr>
    <tr><td style="padding:0 40px 40px 40px;color:#1A1A1A;font-size:15px;line-height:1.6;">${html}</td></tr>
    <tr><td style="padding:20px 40px;border-top:1px solid #E5E5E5;">
      <p style="margin:0;font-size:12px;color:#888888;text-align:center;">${footerHtml}</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
  };

  const sendTestEmail = async () => {
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: { to_email: user?.email, bot_name: brandAppName, locale },
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
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            <Mail className="w-6 h-6 inline-block mr-2 -mt-1" />
            Email & Notifiche
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gestisci i template delle email transazionali</p>
        </div>

        {/* Locale selector */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setLocale("it")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              locale === "it" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            🇮🇹 Italiano
          </button>
          <button
            onClick={() => setLocale("en")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              locale === "en" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            🇬🇧 English
          </button>
        </div>
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
                    <h3 className="font-semibold text-foreground text-sm">{def.label[locale]}</h3>
                    <div className="flex gap-1 mt-1">
                      {eff.isCustom ? (
                        <Badge variant="secondary" className="text-xs">Personalizzato</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {locale === "it" ? "🇮🇹" : "🇬🇧"} {locale.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{locale === "it" ? "Oggetto:" : "Subject:"}</p>
                <p className="text-sm text-foreground truncate">{eff.subject}</p>
              </div>

              {eff.updated_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {locale === "it" ? "Modificato:" : "Modified:"} {new Date(eff.updated_at).toLocaleDateString(locale === "it" ? "it-IT" : "en-GB")}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => openEditor(type)} className="flex-1">
                  <Edit className="w-3.5 h-3.5 mr-1" /> {locale === "it" ? "Modifica" : "Edit"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewType(type)} className="flex-1">
                  <Eye className="w-3.5 h-3.5 mr-1" /> {locale === "it" ? "Anteprima" : "Preview"}
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
              {locale === "it" ? "Modifica" : "Edit"}: {editType && DEFAULT_TEMPLATES[editType]?.label[locale]}
              <Badge variant="outline" className="text-xs ml-2">{locale === "it" ? "🇮🇹 IT" : "🇬🇧 EN"}</Badge>
            </DialogTitle>
            <DialogDescription>
              {locale === "it"
                ? "Modifica l'oggetto e il corpo HTML del template. Usa le variabili per il contenuto dinamico."
                : "Edit the subject and HTML body of the template. Use variables for dynamic content."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{locale === "it" ? "Oggetto email" : "Email subject"}</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="bg-secondary border-border text-sm" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{locale === "it" ? "Variabili disponibili" : "Available variables"}</Label>
              <div className="flex flex-wrap gap-1.5">
                {editType && DEFAULT_TEMPLATES[editType]?.variables.map((v) => (
                  <button key={v} onClick={() => insertVariable(v)}
                    className="px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono">
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{locale === "it" ? "Corpo email (HTML)" : "Email body (HTML)"}</Label>
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
                className="bg-secondary border-border text-sm font-mono min-h-[300px]" />
            </div>

            <div className="flex gap-2 justify-between">
              <div>
                {editType && getCustom(editType, locale) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> {locale === "it" ? "Ripristina default" : "Restore default"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{locale === "it" ? "Ripristinare il template?" : "Restore template?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {locale === "it"
                            ? "Le personalizzazioni verranno eliminate e il template tornerà ai valori predefiniti."
                            : "Customizations will be deleted and the template will revert to defaults."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{locale === "it" ? "Annulla" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => editType && restoreDefault(editType)}>
                          {locale === "it" ? "Ripristina" : "Restore"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditType(null)}>{locale === "it" ? "Annulla" : "Cancel"}</Button>
                <Button onClick={saveTemplate} disabled={saving} className="gradient-primary text-white border-0">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  {locale === "it" ? "Salva modifiche" : "Save changes"}
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
              {locale === "it" ? "Anteprima" : "Preview"}: {previewType && DEFAULT_TEMPLATES[previewType]?.label[locale]}
              <Badge variant="outline" className="text-xs ml-2">{locale === "it" ? "🇮🇹 IT" : "🇬🇧 EN"}</Badge>
            </DialogTitle>
            <DialogDescription>
              {locale === "it"
                ? "Visualizza come apparirà l'email al destinatario finale."
                : "Preview how the email will look to the final recipient."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-secondary rounded-lg p-1">
                <button onClick={() => setPreviewMode("desktop")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    previewMode === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                  <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button onClick={() => setPreviewMode("mobile")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    previewMode === "mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                  <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={sendTestEmail} disabled={sendingTest}>
                {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                {locale === "it" ? "Invia email di test" : "Send test email"}
              </Button>
            </div>

            {previewType && (
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">{locale === "it" ? "Oggetto:" : "Subject:"}</p>
                <p className="text-sm font-medium text-foreground">
                  {getEffective(previewType).subject
                    .replace(/\{\{app_name\}\}/g, brandAppName)
                    .replace(/\{\{nome\}\}/g, locale === "en" ? "John Smith" : "Mario Rossi")
                    .replace(/\{\{bot_name\}\}/g, "My Chatbot")}
                </p>
              </div>
            )}

            <div className="border border-border rounded-xl overflow-hidden bg-[#F5F5F5] mx-auto transition-all duration-300"
              style={{ maxWidth: previewMode === "mobile" ? 375 : "100%" }}>
              {previewType && (
                <iframe srcDoc={renderPreview(previewType)} className="w-full border-0"
                  style={{ height: previewMode === "mobile" ? 600 : 500 }}
                  title="Email Preview" sandbox="allow-same-origin" />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailTemplates;
