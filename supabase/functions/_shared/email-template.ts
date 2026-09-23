// Shared email template for all transactional emails
// Professional, minimal design with dynamic branding + i18n (it/en)

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

// ——— i18n footer helpers ———
const FOOTER_IT = `<p style="margin:8px 0 0;font-size:11px;color:#AAAAAA;text-align:center;">
  <a href="https://chatbot.your-genius.com" style="color:#AAAAAA;text-decoration:underline;">Assistenza</a> &nbsp;|&nbsp;
  <a href="https://chatbot.your-genius.com/terms" style="color:#AAAAAA;text-decoration:underline;">Termini</a> &nbsp;|&nbsp;
  <a href="https://chatbot.your-genius.com/privacy" style="color:#AAAAAA;text-decoration:underline;">Privacy</a>
</p>`;

const FOOTER_EN = `<p style="margin:8px 0 0;font-size:11px;color:#AAAAAA;text-align:center;">
  <a href="https://chatbot.your-genius.com" style="color:#AAAAAA;text-decoration:underline;">Support</a> &nbsp;|&nbsp;
  <a href="https://chatbot.your-genius.com/terms" style="color:#AAAAAA;text-decoration:underline;">Terms</a> &nbsp;|&nbsp;
  <a href="https://chatbot.your-genius.com/privacy" style="color:#AAAAAA;text-decoration:underline;">Privacy</a>
</p>`;

// ——— Locale-aware email builders ———

export type Locale = "it" | "en";

export function resolveLocale(lang?: string | null): Locale {
  const base = (lang || "it").substring(0, 2).toLowerCase();
  return base === "en" ? "en" : "it";
}

// Welcome email
export function welcomeEmail(brand: BrandSettings, name: string, email: string, loginUrl: string, password?: string, locale: Locale = "it"): string {
  const isEn = locale === "en";
  const body = isEn ? `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Welcome, ${escHtml(name)}! 👋</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#888888;">Your account has been created successfully</p>
    <p style="margin:0 0 16px;">We're glad to have you on board. Your chatbot is ready to be configured: customize it, add your knowledge base, and start capturing leads automatically.</p>
    <div style="background:#F5F5F5;border-radius:8px;padding:16px;margin:0 0 8px;">
      <p style="margin:0 0 6px;font-size:14px;">📧 <strong>Email:</strong> ${escHtml(email)}</p>
      ${password ? `<p style="margin:0;font-size:14px;">🔑 <strong>Temporary password:</strong> ${escHtml(password)}</p>` : ""}
    </div>
    ${password ? `<p style="font-size:13px;color:#E94560;margin:8px 0 0;">⚠️ We recommend changing your password on first login.</p>` : ""}
    ${ctaButton("Access the platform", loginUrl, brand.primary_color)}
  ` : `
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
  const footer = isEn
    ? `<p style="margin:8px 0 0;font-size:11px;color:#AAAAAA;text-align:center;">© 2025 <a href="https://mdac.agency" target="_blank" style="color:#888888;text-decoration:underline;">MDAC s.r.l.</a> — All rights reserved</p>`
    : FOOTER_IT;
  return emailShell(brand, body, footer);
}

export function welcomeSubject(brand: BrandSettings, name: string, locale: Locale = "it"): string {
  return locale === "en"
    ? `Welcome to ${brand.app_name}! 🎉`
    : `Benvenuto/a in ${brand.app_name}! 👋`;
}

// Reset password email
export function resetPasswordEmail(brand: BrandSettings, resetUrl: string, locale: Locale = "it"): string {
  const isEn = locale === "en";
  const body = isEn ? `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1A1A;">Reset your password</h1>
    <p style="margin:0 0 16px;">You requested to reset your account password. Click the button below to choose a new password.</p>
    ${ctaButton("Reset password", resetUrl, brand.primary_color)}
    <p style="margin:20px 0 0;font-size:12px;color:#888888;">This link expires in 24 hours. If you didn't request this, please ignore this email.</p>
  ` : `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1A1A;">Reimposta la tua password</h1>
    <p style="margin:0 0 16px;">Hai richiesto di reimpostare la password del tuo account. Clicca sul pulsante qui sotto per scegliere una nuova password.</p>
    ${ctaButton("Reimposta password", resetUrl, brand.primary_color)}
    <p style="margin:20px 0 0;font-size:12px;color:#888888;">Il link scade tra 24 ore. Se non hai fatto tu questa richiesta, ignora questa email.</p>
  `;
  return emailShell(brand, body);
}

// New lead email (notification to business owner — uses owner's locale)
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
    booking?: { check_in?: string; check_out?: string; adults?: number; children?: number; room_name?: string } | null;
  },
  locale: Locale = "it"
): string {
  const isEn = locale === "en";
  const bk = opts.booking;
  const stayHtml = bk && bk.check_in ? (() => {
    const nights = bk.check_out ? Math.round((Date.parse(bk.check_out) - Date.parse(bk.check_in)) / 86400000) : 0;
    const rows: [string, string][] = [
      [isEn ? "Arrival" : "Arrivo", fmtStayDate(bk.check_in, isEn)],
      [isEn ? "Departure" : "Partenza", fmtStayDate(bk.check_out || "", isEn)],
      [isEn ? "Nights" : "Notti", nights > 0 ? String(nights) : "—"],
      [isEn ? "Guests" : "Ospiti", `${bk.adults ?? 0} ${isEn ? "adults" : "adulti"}${bk.children ? ` + ${bk.children} ${isEn ? "children" : "bambini"}` : ""}`],
      [isEn ? "Room" : "Camera", bk.room_name || "—"],
    ];
    return `<div style="background:#FFF7E8;border:1px solid ${brand.primary_color};border-radius:8px;padding:12px 16px;margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1A1A1A;">🛏️ ${isEn ? "Stay request" : "Richiesta soggiorno"}</p>
      <table style="width:100%;border-collapse:collapse;">${rows.map(([k, v]) => `<tr><td style="padding:4px 0;color:#888;font-size:13px;width:90px;">${k}</td><td style="padding:4px 0;font-weight:600;font-size:14px;color:#1A1A1A;">${escHtml(v)}</td></tr>`).join("")}</table>
    </div>`;
  })() : "";
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
        <div style="font-size:11px;font-weight:600;margin-bottom:2px;opacity:0.7;">${isUser ? (isEn ? "👤 User" : "👤 Utente") : "🤖 " + escHtml(opts.botName)}</div>
        ${escHtml(m.content)}
      </div>
    </div>`;
  }).join("");

  const lblName = isEn ? "Name" : "Nome";
  const lblPhone = isEn ? "Phone" : "Telefono";
  const lblMessage = isEn ? "Message" : "Messaggio";
  const lblPage = isEn ? "Page" : "Pagina";
  const lblLang = isEn ? "Visitor language" : "Lingua visitatore";
  const lblTranscript = isEn ? "Chat Transcript" : "Trascrizione Chat";

  const body = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">${isEn ? "You have a new message 💬" : "Hai ricevuto un nuovo messaggio 💬"}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#888888;">${escHtml(opts.botName)}</p>
    ${stayHtml}
    <div style="background:#F5F5F5;border-radius:8px;padding:4px 12px;margin:0 0 20px;font-size:13px;color:#555;">
      ${langInfo.flag} ${lblLang}: <strong>${escHtml(langInfo.name)}</strong>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;width:90px;vertical-align:top;">${lblName}</td><td style="padding:10px 0;font-weight:600;font-size:14px;color:#1A1A1A;">${escHtml(opts.visitorName)}</td></tr>
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;vertical-align:top;">Email</td><td style="padding:10px 0;font-size:14px;"><a href="mailto:${escHtml(opts.visitorEmail)}" style="color:${brand.primary_color};text-decoration:none;">${escHtml(opts.visitorEmail)}</a></td></tr>
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;vertical-align:top;">${lblPhone}</td><td style="padding:10px 0;font-size:14px;color:#1A1A1A;">${escHtml(opts.phone || "") || "—"}</td></tr>
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;vertical-align:top;">${lblMessage}</td><td style="padding:10px 0;font-size:14px;color:#1A1A1A;">${escHtml(opts.message || "") || "—"}</td></tr>
      <tr><td style="padding:10px 0;color:#888888;font-size:13px;vertical-align:top;">${lblPage}</td><td style="padding:10px 0;font-size:13px;color:#888888;">${escHtml(opts.sourceUrl || "") || "—"}</td></tr>
    </table>
    ${opts.transcript && opts.transcript.length > 0 ? `
    <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1A1A1A;">${lblTranscript}</h2>
    <div style="background:#F5F5F5;border-radius:8px;padding:16px;max-height:400px;overflow-y:auto;margin-bottom:8px;">
      ${transcriptHtml}
    </div>` : ""}
    ${ctaButton(isEn ? "View conversation" : "Visualizza conversazione", opts.dashboardUrl, brand.primary_color)}
  `;
  return emailShell(brand, body);
}

function fmtStayDate(iso: string, isEn: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "—";
  return isEn ? `${m[3]}/${m[2]}/${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`;
}

export function hotelLeadSubject(b: { check_in?: string; check_out?: string; adults?: number; children?: number }, locale: Locale = "it"): string {
  const isEn = locale === "en";
  const kids = b.children ? ` + ${b.children} ${isEn ? "children" : "bambini"}` : "";
  return isEn
    ? `Stay request: ${fmtStayDate(b.check_in || "", true)} → ${fmtStayDate(b.check_out || "", true)}, ${b.adults ?? 0} adults${kids}`
    : `Richiesta soggiorno: ${fmtStayDate(b.check_in || "", false)} → ${fmtStayDate(b.check_out || "", false)}, ${b.adults ?? 0} adulti${kids}`;
}

export function newLeadSubject(name: string, botName: string, locale: Locale = "it"): string {
  return locale === "en"
    ? `🔔 New Lead: ${name} - ${botName}`
    : `🔔 Nuovo Lead: ${name} - ${botName}`;
}

// Test email
export function testEmail(brand: BrandSettings, toEmail: string, botName: string, locale: Locale = "it"): string {
  const isEn = locale === "en";
  const now = new Date().toLocaleString(isEn ? "en-GB" : "it-IT", { timeZone: "Europe/Rome" });
  const body = isEn ? `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1A1A;">✅ Test Email Successful!</h1>
    <p style="margin:0 0 20px;">Email notifications are configured correctly. You will receive a notification every time a new lead is captured by chatbot <strong>${escHtml(botName)}</strong>.</p>
    <div style="background:#F5F5F5;border-radius:8px;padding:16px;margin-bottom:8px;">
      <p style="margin:0 0 6px;font-size:13px;color:#1A1A1A;">📧 Recipient: <strong>${escHtml(toEmail)}</strong></p>
      <p style="margin:0;font-size:13px;color:#1A1A1A;">🕐 Sent at: ${now}</p>
    </div>
    ${ctaButton("Go to Dashboard", "https://white-label-converser.lovable.app/dashboard/leads", brand.primary_color)}
  ` : `
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

// Chat ended recap email (inactivity auto-close)
export function chatEndedRecapEmail(
  brand: BrandSettings,
  opts: { botName: string; messageCount: number; durationMinutes: number; sourceUrl: string; dashboardUrl: string },
  locale: Locale = "it"
): string {
  const isEn = locale === "en";
  const rows = [
    [isEn ? "Messages" : "Messaggi", String(opts.messageCount)],
    [isEn ? "Duration" : "Durata", `${opts.durationMinutes} ${isEn ? "min" : "min"}`],
    [isEn ? "Page" : "Pagina", opts.sourceUrl || "—"],
  ].map(([k, v]) => `<tr><td style="padding:10px 0;color:#888888;font-size:13px;width:110px;vertical-align:top;">${escHtml(k)}</td><td style="padding:10px 0;font-size:14px;color:#1A1A1A;font-weight:600;">${escHtml(v)}</td></tr>`).join("");

  const body = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">${isEn ? "A chat has just ended 💬" : "Una chat si è appena conclusa 💬"}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#888888;">${escHtml(opts.botName)}</p>
    <p style="margin:0 0 16px;">${isEn
      ? "The conversation was automatically closed after a period of inactivity. Here is a short recap."
      : "La conversazione è stata chiusa automaticamente dopo un periodo di inattività. Ecco un breve riepilogo."}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">${rows}</table>
    ${ctaButton(isEn ? "View full conversation" : "Vedi la conversazione completa", opts.dashboardUrl, brand.primary_color)}
  `;
  return emailShell(brand, body);
}

export function chatEndedRecapSubject(messageCount: number, botName: string, locale: Locale = "it"): string {
  return locale === "en"
    ? `💬 Chat ended: ${messageCount} messages - ${botName}`
    : `💬 Chat conclusa: ${messageCount} messaggi - ${botName}`;
}


// Weekly summary email
export function weeklySummaryEmail(
  brand: BrandSettings,
  opts: {
    totalConversations: number;
    totalMessages: number;
    avgResponseTime: string;
    dashboardUrl: string;
    unsubscribeUrl?: string;
  },
  locale: Locale = "it"
): string {
  const isEn = locale === "en";
  const body = isEn ? `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Conversations summary 📊</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;">Your weekly summary</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead><tr style="border-bottom:2px solid #E5E5E5;">
        <th style="text-align:left;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Metric</th>
        <th style="text-align:right;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Value</th>
      </tr></thead>
      <tbody>
        <tr style="border-bottom:1px solid #E5E5E5;"><td style="padding:14px 8px;font-size:14px;">Total conversations</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">${opts.totalConversations}</td></tr>
        <tr style="border-bottom:1px solid #E5E5E5;"><td style="padding:14px 8px;font-size:14px;">Messages received</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">${opts.totalMessages}</td></tr>
        <tr><td style="padding:14px 8px;font-size:14px;">Avg. response time</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">${escHtml(opts.avgResponseTime)}</td></tr>
      </tbody>
    </table>
    ${ctaButton("View all conversations", opts.dashboardUrl, brand.primary_color)}
  ` : `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#1A1A1A;">Riepilogo conversazioni 📊</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;">Il tuo riepilogo settimanale</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead><tr style="border-bottom:2px solid #E5E5E5;">
        <th style="text-align:left;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Metrica</th>
        <th style="text-align:right;padding:12px 8px;font-size:13px;color:#888888;font-weight:500;">Valore</th>
      </tr></thead>
      <tbody>
        <tr style="border-bottom:1px solid #E5E5E5;"><td style="padding:14px 8px;font-size:14px;">Totale conversazioni</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">${opts.totalConversations}</td></tr>
        <tr style="border-bottom:1px solid #E5E5E5;"><td style="padding:14px 8px;font-size:14px;">Messaggi ricevuti</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">${opts.totalMessages}</td></tr>
        <tr><td style="padding:14px 8px;font-size:14px;">Tempo medio di risposta</td><td style="padding:14px 8px;font-size:14px;text-align:right;font-weight:600;">${escHtml(opts.avgResponseTime)}</td></tr>
      </tbody>
    </table>
    ${ctaButton("Vedi tutte le conversazioni", opts.dashboardUrl, brand.primary_color)}
  `;
  const footer = opts.unsubscribeUrl
    ? `<p style="margin:8px 0 0;font-size:11px;color:#AAAAAA;text-align:center;"><a href="${escHtml(opts.unsubscribeUrl)}" style="color:#AAAAAA;text-decoration:underline;">${isEn ? "Unsubscribe from weekly summary" : "Disattiva riepilogo settimanale"}</a></p>`
    : "";
  return emailShell(brand, body, footer);
}

// ——— Custom template support ———

export interface CustomTemplate {
  subject: string;
  html_body: string;
}

/**
 * Fetch a custom email template from DB for a given type and locale.
 * Falls back to IT locale if no template exists for the requested locale.
 * Returns null if no custom template at all, meaning use the default.
 */
export async function fetchCustomTemplate(supabase: any, type: string, locale: Locale = "it"): Promise<CustomTemplate | null> {
  try {
    // Try requested locale first
    const { data } = await supabase
      .from("email_templates")
      .select("subject, html_body")
      .eq("type", type)
      .eq("locale", locale)
      .maybeSingle();
    if (data && data.html_body) return data as CustomTemplate;

    // Fallback to IT if we asked for EN
    if (locale !== "it") {
      const { data: fallback } = await supabase
        .from("email_templates")
        .select("subject, html_body")
        .eq("type", type)
        .eq("locale", "it")
        .maybeSingle();
      if (fallback && fallback.html_body) return fallback as CustomTemplate;
    }
  } catch (_) {}
  return null;
}

/**
 * Resolve a user's preferred locale from the profiles table.
 */
export async function resolveUserLocale(supabase: any, userId: string): Promise<Locale> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", userId)
      .single();
    if (data?.language) return resolveLocale(data.language);
  } catch (_) {}
  return "it";
}

/**
 * Resolve a client's owner locale from profiles via client_id.
 */
export async function resolveClientOwnerLocale(supabase: any, clientId: string): Promise<Locale> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("client_id", clientId)
      .limit(1)
      .single();
    if (data?.language) return resolveLocale(data.language);
  } catch (_) {}
  return "it";
}

export function renderCustomTemplate(
  brand: BrandSettings,
  template: CustomTemplate,
  variables: Record<string, string>
): string {
  let body = template.html_body;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(escapeRegex(key), "g");
    body = body.replace(regex, escHtml(value));
  }

  body = body.replace(/background:#1A1A1A/g, `background:${brand.primary_color}`);

  return emailShell(brand, body);
}

export function replaceSubjectVars(subject: string, variables: Record<string, string>): string {
  let result = subject;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(escapeRegex(key), "g");
    result = result.replace(regex, value);
  }
  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
