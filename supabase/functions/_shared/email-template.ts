// Shared email template for all transactional emails
// Professional, minimal design with dynamic branding

export function escHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface BrandSettings {
  logo_url?: string | null;
  app_name: string;
  primary_color: string;
  footer_text: string;
}

export const DEFAULT_BRAND: BrandSettings = {
  logo_url: null,
  app_name: "Genius Chatbot",
  primary_color: "#1A1A1A",
  footer_text: "Genius Chatbot Builder — Un prodotto MDAC S.r.l.",
};

export async function fetchBrandSettings(supabase: any): Promise<BrandSettings> {
  try {
    const { data } = await supabase
      .from("brand_settings")
      .select("logo_url, app_name, primary_color, footer_text")
      .limit(1)
      .single();
    if (data) return { ...DEFAULT_BRAND, ...data };
  } catch (_) {}
  return DEFAULT_BRAND;
}

function logoHtml(brand: BrandSettings): string {
  if (brand.logo_url) {
    return `<img src="${escHtml(brand.logo_url)}" alt="${escHtml(brand.app_name)}" style="max-height:60px;max-width:200px;display:block;margin:0 auto 32px;" />`;
  }
  return `<div style="text-align:center;margin-bottom:32px;font-size:22px;font-weight:700;color:#1A1A1A;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escHtml(brand.app_name)}</div>`;
}

function ctaButton(text: string, url: string, color: string): string {
  return `<div style="text-align:center;margin:28px 0 0;">
    <a href="${escHtml(url)}" style="display:inline-block;background:${escHtml(color)};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escHtml(text)}</a>
  </div>`;
}

/**
 * Wraps content in the standard email shell.
 * @param brand - Brand settings
 * @param bodyHtml - Inner body HTML (no wrapper needed)
 * @param footerExtra - Optional extra footer HTML (e.g. unsubscribe link)
 */
export function emailShell(brand: BrandSettings, bodyHtml: string, footerExtra?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:40px 40px 0 40px;">
      ${logoHtml(brand)}
    </td></tr>
    <tr><td style="padding:0 40px 40px 40px;color:#1A1A1A;font-size:15px;line-height:1.6;">
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 40px;border-top:1px solid #E5E5E5;">
      <p style="margin:0;font-size:12px;color:#888888;text-align:center;line-height:1.5;">${escHtml(brand.footer_text)}</p>
      ${footerExtra || ""}
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

// ——— Specific email builders ———

export function welcomeEmail(brand: BrandSettings, name: string, email: string, loginUrl: string, password?: string): string {
  const body = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Benvenuto/a, ${escHtml(name)}! 👋</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#888888;">Il tuo account è stato creato con successo</p>
    <p style="margin:0 0 16px;">Siamo felici di averti a bordo. Il tuo chatbot è pronto per essere configurato: personalizzalo, aggiungi la tua knowledge base e inizia a catturare lead in automatico.</p>
    <div style="background:#F5F5F5;border-radius:8px;padding:16px;margin:0 0 8px;">
      <p style="margin:0 0 6px;font-size:14px;">📧 <strong>Email:</strong> ${escHtml(email)}</p>
      ${password ? `<p style="margin:0;font-size:14px;">🔑 <strong>Password temporanea:</strong> ${escHtml(password)}</p>` : ""}
    </div>
    ${password ? `<p style="font-size:13px;color:#E94560;margin:8px 0 0;">⚠️ Ti consigliamo di cambiare la password al primo accesso.</p>` : ""}
    ${ctaButton("Accedi alla piattaforma", loginUrl, brand.primary_color)}
  `;
  const footer = `<p style="margin:8px 0 0;font-size:11px;color:#AAAAAA;text-align:center;">
    <a href="https://chatbot.your-genius.com" style="color:#AAAAAA;text-decoration:underline;">Assistenza</a> &nbsp;|&nbsp;
    <a href="https://chatbot.your-genius.com/terms" style="color:#AAAAAA;text-decoration:underline;">Termini</a> &nbsp;|&nbsp;
    <a href="https://chatbot.your-genius.com/privacy" style="color:#AAAAAA;text-decoration:underline;">Privacy</a>
  </p>`;
  return emailShell(brand, body, footer);
}

export function resetPasswordEmail(brand: BrandSettings, resetUrl: string): string {
  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1A1A;">Reimposta la tua password</h1>
    <p style="margin:0 0 16px;">Hai richiesto di reimpostare la password del tuo account. Clicca sul pulsante qui sotto per scegliere una nuova password.</p>
    ${ctaButton("Reimposta password", resetUrl, brand.primary_color)}
    <p style="margin:20px 0 0;font-size:12px;color:#888888;">Il link scade tra 24 ore. Se non hai fatto tu questa richiesta, ignora questa email.</p>
  `;
  return emailShell(brand, body);
}

export function newLeadEmail(
  brand: BrandSettings,
  opts: {
    botName: string;
    visitorName: string;
    visitorEmail: string;
    phone?: string;
    message?: string;
    sourceUrl?: string;
    language?: string;
    transcript?: any[];
    dashboardUrl: string;
  }
): string {
  const langMap: Record<string, { flag: string; name: string }> = {
    it: { flag: "🇮🇹", name: "Italiano" }, en: { flag: "🇬🇧", name: "English" },
    fr: { flag: "🇫🇷", name: "Français" }, de: { flag: "🇩🇪", name: "Deutsch" },
    es: { flag: "🇪🇸", name: "Español" }, pt: { flag: "🇵🇹", name: "Português" },
    nl: { flag: "🇳🇱", name: "Nederlands" }, ru: { flag: "🇷🇺", name: "Русский" },
    zh: { flag: "🇨🇳", name: "中文" }, ja: { flag: "🇯🇵", name: "日本語" },
    ar: { flag: "🇸🇦", name: "العربية" }, pl: { flag: "🇵🇱", name: "Polski" },
  };
  const base = (opts.language || "en").substring(0, 2).toLowerCase();
  const langInfo = langMap[base] || { flag: "🌐", name: opts.language || "Unknown" };

  const transcriptHtml = (opts.transcript || []).map((m: any) => {
    const isUser = m.role === "user";
    return `<div style="display:flex;justify-content:${isUser ? "flex-end" : "flex-start"};margin:4px 0;">
      <div style="max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;
        ${isUser
          ? `background:${brand.primary_color};color:#fff;border-bottom-right-radius:4px;`
          : `background:#F5F5F5;color:#1A1A1A;border-bottom-left-radius:4px;`
        }">
        <div style="font-size:11px;font-weight:600;margin-bottom:2px;opacity:0.7;">${isUser ? "👤 Utente" : "🤖 " + escHtml(opts.botName)}</div>
        ${escHtml(m.content)}
      </div>
    </div>`;
  }).join("");

  const body = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Hai ricevuto un nuovo messaggio 💬</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#888888;">${escHtml(opts.botName)}</p>
    <div style="background:#F5F5F5;border-radius:8px;padding:4px 12px;margin:0 0 20px;font-size:13px;color:#555;">
      ${langInfo.flag} Lingua visitatore: <strong>${escHtml(langInfo.name)}</strong>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;width:90px;vertical-align:top;">Nome</td><td style="padding:10px 0;font-weight:600;font-size:14px;color:#1A1A1A;">${escHtml(opts.visitorName)}</td></tr>
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;vertical-align:top;">Email</td><td style="padding:10px 0;font-size:14px;"><a href="mailto:${escHtml(opts.visitorEmail)}" style="color:${brand.primary_color};text-decoration:none;">${escHtml(opts.visitorEmail)}</a></td></tr>
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;vertical-align:top;">Telefono</td><td style="padding:10px 0;font-size:14px;color:#1A1A1A;">${escHtml(opts.phone || "") || "—"}</td></tr>
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;vertical-align:top;">Messaggio</td><td style="padding:10px 0;font-size:14px;color:#1A1A1A;">${escHtml(opts.message || "") || "—"}</td></tr>
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;vertical-align:top;">Pagina</td><td style="padding:10px 0;font-size:13px;color:#888888;">${escHtml(opts.sourceUrl || "") || "—"}</td></tr>
    </table>
    ${opts.transcript && opts.transcript.length > 0 ? `
    <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1A1A1A;">Trascrizione Chat</h2>
    <div style="background:#F5F5F5;border-radius:8px;padding:16px;max-height:400px;overflow-y:auto;margin-bottom:8px;">
      ${transcriptHtml}
    </div>` : ""}
    ${ctaButton("Visualizza conversazione", opts.dashboardUrl, brand.primary_color)}
  `;
  return emailShell(brand, body);
}

export function testEmail(brand: BrandSettings, toEmail: string, botName: string): string {
  const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1A1A;">✅ Email di Test Riuscita!</h1>
    <p style="margin:0 0 20px;">Le notifiche email sono configurate correttamente. Riceverai una notifica ogni volta che un nuovo lead viene catturato dal chatbot <strong>${escHtml(botName)}</strong>.</p>
    <div style="background:#F5F5F5;border-radius:8px;padding:16px;margin-bottom:8px;">
      <p style="margin:0 0 6px;font-size:13px;color:#1A1A1A;">📧 Destinatario: <strong>${escHtml(toEmail)}</strong></p>
      <p style="margin:0;font-size:13px;color:#1A1A1A;">🕐 Inviato il: ${now}</p>
    </div>
    ${ctaButton("Vai al Dashboard", "https://white-label-converser.lovable.app/dashboard/leads", brand.primary_color)}
  `;
  return emailShell(brand, body);
}

export function weeklySummaryEmail(
  brand: BrandSettings,
  opts: {
    totalConversations: number;
    totalMessages: number;
    avgResponseTime: string;
    dashboardUrl: string;
    unsubscribeUrl?: string;
  }
): string {
  const body = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Riepilogo conversazioni 📊</h1>
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
          <td style="padding:14px 8px;font-size:14px;color:#1A1A1A;">Totale conversazioni</td>
          <td style="padding:14px 8px;font-size:14px;color:#1A1A1A;text-align:right;font-weight:600;">${opts.totalConversations}</td>
        </tr>
        <tr style="border-bottom:1px solid #E5E5E5;">
          <td style="padding:14px 8px;font-size:14px;color:#1A1A1A;">Messaggi ricevuti</td>
          <td style="padding:14px 8px;font-size:14px;color:#1A1A1A;text-align:right;font-weight:600;">${opts.totalMessages}</td>
        </tr>
        <tr>
          <td style="padding:14px 8px;font-size:14px;color:#1A1A1A;">Tempo medio di risposta</td>
          <td style="padding:14px 8px;font-size:14px;color:#1A1A1A;text-align:right;font-weight:600;">${escHtml(opts.avgResponseTime)}</td>
        </tr>
      </tbody>
    </table>
    ${ctaButton("Vedi tutte le conversazioni", opts.dashboardUrl, brand.primary_color)}
  `;
  const footer = opts.unsubscribeUrl
    ? `<p style="margin:8px 0 0;font-size:11px;color:#AAAAAA;text-align:center;"><a href="${escHtml(opts.unsubscribeUrl)}" style="color:#AAAAAA;text-decoration:underline;">Disattiva riepilogo settimanale</a></p>`
    : "";
  return emailShell(brand, body, footer);
}
