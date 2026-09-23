(function () {
  "use strict";

  // ── Helpers ──────────────────────────────────────────────
  function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function renderMarkdown(text) {
    return esc(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, '')
      // markdown links [testo](url) → bottone
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="mdac-cta" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // url nude (non già dentro un tag <a>)
      .replace(/(^|[\s>])(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, function (m, pre, url) {
        return pre + '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">' + url + '</a>';
      })
      .replace(/\n/g, '<br>');
  }

  // ── Asset origin (dove sono ospitate le immagini del widget) ─────────
  var WIDGET_ASSET_ORIGIN = (function () {
    try {
      var s = document.currentScript;
      if (!s) {
        var all = document.getElementsByTagName("script");
        for (var i = all.length - 1; i >= 0; i--) {
          if (all[i].src && all[i].src.indexOf("widget.js") !== -1) { s = all[i]; break; }
        }
      }
      if (s && s.src) return new URL(s.src).origin;
    } catch (e) {}
    return "https://chatbot.your-genius.com";
  })();


  // ── Language detection (full code) ─────────────────────
  var widgetLang = navigator.language || "en";
  var baseLang = widgetLang.substring(0, 2);

  // ── Multi-language form labels ─────────────────────────
  var formLabels = {
    en: {
      placeholder: "Type a message...",
      leadLabel: "📋 Leave your contact details",
      namePlaceholder: "Name *",
      emailPlaceholder: "Email",
      phonePlaceholder: "Phone *",
      contactNote: "Please provide at least email or phone",
      messagePlaceholder: "Message",
      submitBtn: "Submit request",
      calendlyBtn: "📅 Book a consultation",
      successMsg: "✅ Request sent! We'll contact you soon.",
      thankYou: "Thank you! We'll contact you soon. 🎉",
      errorMsg: "Connection error. Please retry.",
      errorReply: "Error in the response.",
      aiDisclaimer: "🤖 You're chatting with an AI-based virtual assistant. Responses may contain errors.",
    },
    it: {
      placeholder: "Scrivi un messaggio...",
      leadLabel: "📋 Lascia i tuoi contatti",
      namePlaceholder: "Nome *",
      emailPlaceholder: "Email",
      phonePlaceholder: "Telefono *",
      contactNote: "Inserisci almeno uno tra email e telefono",
      messagePlaceholder: "Messaggio",
      submitBtn: "Invia richiesta",
      calendlyBtn: "📅 Prenota una consulenza",
      successMsg: "✅ Richiesta inviata! Ti contatteremo presto.",
      thankYou: "Grazie! Ti contatteremo presto. 🎉",
      errorMsg: "Errore di connessione. Riprova.",
      errorReply: "Errore nella risposta.",
      aiDisclaimer: "🤖 Stai parlando con un assistente virtuale basato su IA. Le risposte possono contenere errori.",
    },
    fr: {
      placeholder: "Écrivez un message...",
      leadLabel: "📋 Laissez vos coordonnées",
      namePlaceholder: "Nom *",
      emailPlaceholder: "Email",
      phonePlaceholder: "Téléphone *",
      contactNote: "Indiquez au moins un email ou un téléphone",
      messagePlaceholder: "Message",
      submitBtn: "Envoyer",
      calendlyBtn: "📅 Réserver une consultation",
      successMsg: "✅ Demande envoyée! Nous vous contacterons.",
      thankYou: "Merci! Nous vous contacterons bientôt. 🎉",
      errorMsg: "Erreur de connexion. Réessayez.",
      errorReply: "Erreur dans la réponse.",
      aiDisclaimer: "🤖 Vous parlez avec un assistant virtuel basé sur l'IA. Les réponses peuvent contenir des erreurs.",
    },
    de: {
      placeholder: "Nachricht schreiben...",
      leadLabel: "📋 Hinterlassen Sie Ihre Daten",
      namePlaceholder: "Name *",
      emailPlaceholder: "E-Mail *",
      phonePlaceholder: "Telefon",
      messagePlaceholder: "Nachricht",
      submitBtn: "Absenden",
      calendlyBtn: "📅 Beratung buchen",
      successMsg: "✅ Anfrage gesendet! Wir melden uns.",
      thankYou: "Danke! Wir melden uns bald. 🎉",
      errorMsg: "Verbindungsfehler. Bitte erneut versuchen.",
      errorReply: "Fehler in der Antwort.",
      aiDisclaimer: "🤖 Sie chatten mit einem KI-basierten virtuellen Assistenten. Antworten können Fehler enthalten.",
    },
    es: {
      placeholder: "Escribe un mensaje...",
      leadLabel: "📋 Deje sus datos",
      namePlaceholder: "Nombre *",
      emailPlaceholder: "Email *",
      phonePlaceholder: "Teléfono",
      messagePlaceholder: "Mensaje",
      submitBtn: "Enviar solicitud",
      calendlyBtn: "📅 Reservar consulta",
      successMsg: "✅ ¡Solicitud enviada! Le contactaremos.",
      thankYou: "¡Gracias! Le contactaremos pronto. 🎉",
      errorMsg: "Error de conexión. Inténtelo de nuevo.",
      errorReply: "Error en la respuesta.",
      aiDisclaimer: "🤖 Estás hablando con un asistente virtual basado en IA. Las respuestas pueden contener errores.",
    },
    pt: {
      placeholder: "Escreva uma mensagem...",
      leadLabel: "📋 Deixe seus dados",
      namePlaceholder: "Nome *",
      emailPlaceholder: "Email *",
      phonePlaceholder: "Telefone",
      messagePlaceholder: "Mensagem",
      submitBtn: "Enviar pedido",
      calendlyBtn: "📅 Agendar consulta",
      successMsg: "✅ Pedido enviado! Entraremos em contato.",
      thankYou: "Obrigado! Entraremos em contato em breve. 🎉",
      errorMsg: "Erro de conexão. Tente novamente.",
      errorReply: "Erro na resposta.",
      aiDisclaimer: "🤖 Está a falar com um assistente virtual baseado em IA. As respostas podem conter erros.",
    },
  };

  var t = formLabels[baseLang] || formLabels["en"];

  // ── Hotel module labels (used only when business_vertical === "hotel") ──
  var hotelLabels = {
    en: { arrival: "Arrival", departure: "Departure", adults: "Adults", children: "Children", room: "Preferred room", anyRoom: "No preference", dateError: "Check the dates: arrival from today, departure after arrival.", bookBtn: "Check availability and book" },
    it: { arrival: "Arrivo", departure: "Partenza", adults: "Adulti", children: "Bambini", room: "Camera preferita", anyRoom: "Nessuna preferenza", dateError: "Controlla le date: arrivo da oggi, partenza dopo l'arrivo.", bookBtn: "Verifica disponibilità e prenota" },
  };
  var th = hotelLabels[baseLang] || hotelLabels["en"];
  var hotelBookingUrl = "";
  function isHotel() { return !!(config && config.business_vertical === "hotel" && config.hotel); }
  function todayIso() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fmtHotelDate(iso, f) { var p = iso.split("-"); return f === "DD/MM/YYYY" ? p[2] + "/" + p[1] + "/" + p[0] : iso; }
  function buildHotelUrl(b) {
    var tpl = (config.hotel && config.hotel.engine_url_template) || "";
    if (!tpl) return "";
    var f = config.hotel.date_format;
    return tpl.replace(/\{checkin\}/g, encodeURIComponent(fmtHotelDate(b.check_in, f)))
      .replace(/\{checkout\}/g, encodeURIComponent(fmtHotelDate(b.check_out, f)))
      .replace(/\{adults\}/g, String(b.adults))
      .replace(/\{children\}/g, String(b.children));
  }

  // ── Detect script tag & token ───────────────────────────
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();
  var EMBED_TOKEN = scriptTag.getAttribute("data-token");
  if (!EMBED_TOKEN) { console.error("[Genius Widget] Missing data-token"); return; }
  var FULLSCREEN = scriptTag.getAttribute("data-fullscreen") === "true";
  var ROOM = (scriptTag.getAttribute("data-room") || "").trim().slice(0, 40);

  // ── Supabase URL ──
  var SUPABASE_URL = (function () {
    var src = scriptTag.getAttribute("src") || "";
    try {
      var u = new URL(src, window.location.origin);
      return "https://hbzgpxaxrqbbvcyvklln.supabase.co";
    } catch (e) {
      return "https://hbzgpxaxrqbbvcyvklln.supabase.co";
    }
  })();

  // ── Session ─────────────────────────────────────────────
  var SESSION_KEY = "genius_widget_session_" + EMBED_TOKEN;
  var MSG_KEY = "genius_widget_msgs_" + EMBED_TOKEN;
  var WELCOME_KEY = "genius_widget_welcome_" + EMBED_TOKEN;

  function getSessionToken() {
    var tk = sessionStorage.getItem(SESSION_KEY);
    if (!tk) { tk = uuidv4(); sessionStorage.setItem(SESSION_KEY, tk); }
    return tk;
  }

  function saveMessages(msgs) {
    try { sessionStorage.setItem(MSG_KEY, JSON.stringify(msgs)); } catch (e) { /* full */ }
  }

  function loadMessages() {
    try { var m = sessionStorage.getItem(MSG_KEY); return m ? JSON.parse(m) : null; } catch (e) { return null; }
  }

  var sessionToken = getSessionToken();

  // ── State ───────────────────────────────────────────────
  var config = null;
  var messages = [];
  var isOpen = FULLSCREEN;
  var isLoading = false;
  var showLeadForm = false;
  var leadSent = false;
  var userMessageCount = 0;
  var serviceCategory = "";
  var serviceSending = false;

  // ── Create Shadow DOM ───────────────────────────────────
  var host = document.createElement("div");
  host.id = "genius-chat-widget";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "closed" });

  // ── Styles ──────────────────────────────────────────────
  function hexToRgb(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return "245,166,35";
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",");
  }

  function buildStyles(cfg) {
    var pc = cfg.primary_color || "#F59E0B";
    var bg = cfg.background_color || "#1A1A2E";
    var tc = cfg.text_color || "#FFFFFF";
    var cc = cfg.circle_color || "#F5A623";
    var ccRgb = hexToRgb(cc);
    var pos = cfg.launcher_position === "bottom-left" ? "left:20px;" : "right:20px;";
    var full = FULLSCREEN ? "position:fixed;inset:0;width:100%;height:100%;bottom:auto;left:0;right:0;border-radius:0;opacity:1;transform:none;pointer-events:auto;box-shadow:none;" : "";

    return "\
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}\
.mdac-launcher{position:fixed;bottom:20px;" + pos + "width:60px;height:60px;border-radius:50%;background:" + pc + ";color:#fff;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:28px;transition:transform .2s,box-shadow .2s;z-index:1;}\
.mdac-launcher:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(0,0,0,.35);}\
.mdac-launcher.mdac-genie-full{background:" + cc + ";box-shadow:0 4px 24px rgba(0,0,0,.25);overflow:visible;}\
.mdac-launcher.mdac-genie-full:hover{box-shadow:0 6px 32px rgba(0,0,0,.35);}\
.mdac-launcher.mdac-genie-full::before{content:'';position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle,rgba(" + ccRgb + ",.85) 0%,rgba(" + ccRgb + ",.35) 45%,rgba(" + ccRgb + ",0) 70%);opacity:0;animation:mdac-glow 4.5s ease-in-out infinite;pointer-events:none;z-index:-1;}\
.mdac-launcher.mdac-genie-full img{width:83%;height:83%;object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35));}\
@keyframes mdac-glow{0%,100%{opacity:0;transform:scale(.85);}50%{opacity:1;transform:scale(1.12);}}\
.mdac-panel{position:fixed;bottom:90px;" + pos + "width:370px;height:520px;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 48px rgba(0,0,0,.3);opacity:0;transform:translateY(20px) scale(.95);pointer-events:none;transition:opacity .25s ease,transform .25s ease;z-index:2;background:#fff;}\
.mdac-panel.mdac-fullscreen{" + full + "}\
.mdac-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}\
.mdac-header{background:" + bg + ";padding:14px 16px;display:flex;align-items:center;gap:10px;}\
.mdac-header-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}\
.mdac-header-info{flex:1;}\
.mdac-header-name{font-size:14px;font-weight:600;color:" + tc + ";}\
.mdac-header-powered{font-size:10px;color:" + tc + ";opacity:.55;margin-top:1px;}\
.mdac-close{background:none;border:none;color:" + tc + ";opacity:.6;cursor:pointer;font-size:20px;padding:4px 6px;border-radius:6px;}\
.mdac-close:hover{opacity:1;background:rgba(255,255,255,.1);}\
.mdac-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8f9fa;}\
.mdac-msg{display:flex;gap:8px;align-items:flex-end;max-width:88%;}\
.mdac-msg.user{align-self:flex-end;flex-direction:row-reverse;}\
.mdac-msg.bot{align-self:flex-start;}\
.mdac-bubble{padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.5;word-break:break-word;}\
.mdac-msg.user .mdac-bubble{background:" + pc + ";color:#fff;border-bottom-right-radius:4px;}\
.mdac-msg.bot .mdac-bubble{background:#fff;color:#1a1a2e;border:1px solid #e5e7eb;border-bottom-left-radius:4px;}\
.mdac-msg-avatar{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}\
.mdac-bubble strong{font-weight:700;}\
.mdac-bubble em{font-style:italic;}\
.mdac-bubble ul,.mdac-bubble ol{margin:4px 0 4px 16px;padding:0;}\
.mdac-bubble li{margin:2px 0;list-style:disc;}\
.mdac-bubble ol li{list-style:decimal;}\
.mdac-cta{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:9px 14px;border-radius:10px;background:" + pc + ";color:#fff !important;font-size:13px;font-weight:600;text-decoration:none !important;cursor:pointer;}\
.mdac-cta:hover{opacity:.9;}\
.mdac-msg.bot .mdac-msg-avatar{background:#e5e7eb;}\
.mdac-msg.user .mdac-msg-avatar{background:" + pc + ";color:#fff;font-size:12px;}\
.mdac-typing{display:flex;gap:4px;padding:10px 14px;}\
.mdac-dot{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:mdac-bounce .6s infinite alternate;}\
.mdac-dot:nth-child(2){animation-delay:.15s;}\
.mdac-dot:nth-child(3){animation-delay:.3s;}\
@keyframes mdac-bounce{to{transform:translateY(-6px);opacity:.4;}}\
.mdac-input-area{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e5e7eb;background:#fff;}\
.mdac-quick-replies{display:flex;gap:7px;overflow-x:auto;padding:8px 12px;background:#fff;border-top:1px solid #f3f4f6;scrollbar-width:none;}\
.mdac-quick-replies::-webkit-scrollbar{display:none;}\
.mdac-quick{flex:0 0 auto;border:1px solid " + pc + ";background:#fff;color:" + pc + ";border-radius:999px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer;}\
.mdac-service-form{margin:0 12px 8px;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;display:flex;flex-direction:column;gap:8px;}\
.mdac-service-form input,.mdac-service-form textarea{border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;}\
.mdac-service-actions{display:flex;gap:8px;}\
.mdac-service-actions button{flex:1;border-radius:8px;padding:9px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-weight:600;}\
.mdac-service-actions .primary{background:" + pc + ";border-color:" + pc + ";color:#fff;}\
.mdac-footer{text-align:center;padding:4px 10px 6px;background:#fff;border-top:1px solid #f3f4f6;display:flex;flex-direction:column;gap:2px;}\
.mdac-footer span{font-size:9.5px;color:#9ca3af;line-height:1.3;}\
.mdac-footer a{font-size:10px;color:#9ca3af;text-decoration:none;font-weight:500;}\
.mdac-footer a:hover{color:" + pc + ";text-decoration:underline;}\
.mdac-input{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-size:13px;outline:none;transition:border .15s;}\
.mdac-input:focus{border-color:" + pc + ";}\
.mdac-send{width:36px;height:36px;border-radius:10px;background:" + pc + ";color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s;}\
.mdac-send:disabled{opacity:.4;cursor:default;}\
.mdac-lead-form{padding:12px 14px;display:flex;flex-direction:column;gap:8px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin:0 0 4px;}\
.mdac-lead-form label{font-size:12px;font-weight:500;color:#6b7280;}\
.mdac-lead-form input,.mdac-lead-form textarea{border:1px solid #e5e7eb;border-radius:8px;padding:7px 10px;font-size:13px;outline:none;font-family:inherit;}\
.mdac-lead-form textarea{resize:none;min-height:50px;}\
.mdac-lead-form input:focus,.mdac-lead-form textarea:focus{border-color:" + pc + ";}\
.mdac-lead-btn{background:" + pc + ";color:#fff;border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s;}\
.mdac-lead-btn:hover{opacity:.9;}\
.mdac-lead-btn:disabled{opacity:.4;cursor:default;}\
.mdac-calendly{background:none;border:1px solid " + pc + ";color:" + pc + ";border-radius:8px;padding:8px;font-size:13px;font-weight:500;cursor:pointer;text-align:center;margin-top:2px;}\
.mdac-calendly:hover{background:" + pc + ";color:#fff;}\
.mdac-success{text-align:center;padding:16px;font-size:13px;color:#16a34a;font-weight:500;}\
@media(max-width:768px){\
.mdac-panel{width:100%;height:" + (FULLSCREEN ? "100%" : "70vh") + ";bottom:0;left:0;right:0;border-radius:" + (FULLSCREEN ? "0" : "16px 16px 0 0") + ";}\
.mdac-launcher{bottom:16px;" + (cfg.launcher_position === "bottom-left" ? "left:16px;" : "right:16px;") + "width:54px;height:54px;font-size:24px;}\
}\
";
  }

  // ── Render ──────────────────────────────────────────────
  function render() {
    if (!config) return;

    var pc = config.primary_color || "#F59E0B";
    var avatar = config.avatar || "genie";
    var isGenie = avatar === "genie";
    var isGenieFull = avatar === "genie-full";
    var ASSET_ORIGIN = WIDGET_ASSET_ORIGIN;
    var genieUrl = new URL("/images/genius-icon.png", ASSET_ORIGIN).href;
    var genieFullUrl = new URL("/images/genie-full.png", ASSET_ORIGIN).href;
    var genieImgTag = '<img src="' + genieUrl + '" style="width:28px;height:28px;" alt="Genius" />';
    var genieFullTag = '<img src="' + genieFullUrl + '" alt="Genius" />';
    var avatarDisplay = isGenie ? genieImgTag : (isGenieFull ? '<img src="' + genieFullUrl + '" style="width:30px;height:30px;object-fit:contain;" alt="Genius" />' : esc(avatar));
    var avatarSmall = (isGenie || isGenieFull) ? '<img src="' + (isGenieFull ? genieFullUrl : genieUrl) + '" style="width:18px;height:18px;object-fit:contain;" alt="G" />' : esc(avatar);

    var html = '<style>' + buildStyles(config) + '</style>';

    // Launcher
    if (!FULLSCREEN) html += '<button class="mdac-launcher' + (isGenieFull ? ' mdac-genie-full' : '') + '" id="mdac-toggle">' + (isGenieFull ? genieFullTag : avatarDisplay) + '</button>';


    // Panel
    html += '<div class="mdac-panel' + (isOpen ? ' open' : '') + (FULLSCREEN ? ' mdac-fullscreen' : '') + '" id="mdac-panel">';

    // Header
    html += '<div class="mdac-header">';
    html += '<div class="mdac-header-avatar">' + avatarDisplay + '</div>';
    html += '<div class="mdac-header-info"><div class="mdac-header-name">' + esc(config.name || "Assistente") + '</div></div>';
    if (!FULLSCREEN) html += '<button class="mdac-close" id="mdac-close">&times;</button>';
    html += '</div>';

    // Messages
    html += '<div class="mdac-messages" id="mdac-messages">';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var cls = m.role === "user" ? "user" : "bot";
      html += '<div class="mdac-msg ' + cls + '">';
      if (m.role !== "user") {
        html += '<div class="mdac-msg-avatar">' + avatarSmall + '</div>';
      }
      if (m.role === "user") {
        html += '<div class="mdac-bubble">' + esc(m.content) + '</div>';
      } else {
        html += '<div class="mdac-bubble">' + renderMarkdown(m.content) + '</div>';
      }
      if (m.role === "user") {
        html += '<div class="mdac-msg-avatar">👤</div>';
      }
      html += '</div>';
    }

    // Typing indicator
    if (isLoading) {
      html += '<div class="mdac-msg bot"><div class="mdac-msg-avatar">' + avatarSmall + '</div><div class="mdac-bubble"><div class="mdac-typing"><div class="mdac-dot"></div><div class="mdac-dot"></div><div class="mdac-dot"></div></div></div></div>';
    }

    // Lead form
    if (showLeadForm && !leadSent) {
      html += '<div class="mdac-lead-form" id="mdac-lead-form">';
      html += '<label>' + t.leadLabel + '</label>';
      if (isHotel()) {
        var tdy = todayIso();
        html += '<div style="display:flex;gap:6px;"><div style="flex:1;display:flex;flex-direction:column;gap:2px;"><label>' + th.arrival + ' *</label><input type="date" id="mdac-h-in" min="' + tdy + '" /></div>';
        html += '<div style="flex:1;display:flex;flex-direction:column;gap:2px;"><label>' + th.departure + ' *</label><input type="date" id="mdac-h-out" min="' + tdy + '" /></div></div>';
        html += '<div style="display:flex;gap:6px;"><div style="flex:1;display:flex;flex-direction:column;gap:2px;"><label>' + th.adults + '</label><input type="number" id="mdac-h-ad" min="1" max="30" value="2" /></div>';
        html += '<div style="flex:1;display:flex;flex-direction:column;gap:2px;"><label>' + th.children + '</label><input type="number" id="mdac-h-ch" min="0" max="30" value="0" /></div></div>';
        var hr = config.hotel.rooms || [];
        if (hr.length) {
          html += '<label>' + th.room + '</label><select id="mdac-h-room" style="border:1px solid #e5e7eb;border-radius:8px;padding:7px 10px;font-size:13px;font-family:inherit;background:#fff;"><option value="">' + th.anyRoom + '</option>';
          for (var ri = 0; ri < hr.length; ri++) html += '<option value="' + esc(hr[ri].id) + '">' + esc(hr[ri].name) + '</option>';
          html += '</select>';
        }
        html += '<div id="mdac-h-err" style="display:none;font-size:11px;color:#dc2626;">' + th.dateError + '</div>';
      }
      html += '<input type="text" id="mdac-lead-name" placeholder="' + t.namePlaceholder + '" />';
      html += '<input type="email" id="mdac-lead-email" placeholder="' + t.emailPlaceholder + '" />';
      html += '<input type="tel" id="mdac-lead-phone" placeholder="' + t.phonePlaceholder + '" />';
      if (t.contactNote) {
        html += '<div class="mdac-lead-note" style="font-size:11px;opacity:0.7;margin:-2px 0 4px;">' + t.contactNote + '</div>';
      }
      html += '<textarea id="mdac-lead-message" placeholder="' + t.messagePlaceholder + '"></textarea>';
      html += '<button class="mdac-lead-btn" id="mdac-lead-submit">' + t.submitBtn + '</button>';
      if (config.calendly_url) {
        html += '<button class="mdac-calendly" id="mdac-calendly">' + t.calendlyBtn + '</button>';
      }
      html += '</div>';
    }

    if (leadSent) {
      html += '<div class="mdac-success">' + t.successMsg + '</div>';
      if (isHotel() && hotelBookingUrl) {
        html += '<div style="text-align:center;margin-top:-6px;"><a class="mdac-cta" href="' + esc(hotelBookingUrl) + '" target="_blank" rel="noopener noreferrer">' + th.bookBtn + '</a></div>';
      }
    }

    html += '</div>'; // end messages

    var quickReplies = (FULLSCREEN && isHotel() && config.hotel.concierge_requests) ? (config.hotel.in_stay_quick_replies || []) : [];
    if (quickReplies.length && !serviceCategory) {
      html += '<div class="mdac-quick-replies">';
      for (var qi = 0; qi < quickReplies.length; qi++) html += '<button class="mdac-quick" data-category="' + esc(quickReplies[qi]) + '">' + esc(quickReplies[qi]) + '</button>';
      html += '</div>';
    }
    if (serviceCategory) {
      html += '<div class="mdac-service-form"><strong style="font-size:13px;color:#1a1a2e;">' + esc(serviceCategory) + '</strong>';
      html += '<textarea id="mdac-service-message" rows="2" placeholder="' + (baseLang === "it" ? "Messaggio facoltativo" : "Optional message") + '"></textarea>';
      html += '<input id="mdac-service-name" placeholder="' + (baseLang === "it" ? "Nome facoltativo" : "Optional name") + '" />';
      html += '<div class="mdac-service-actions"><button id="mdac-service-cancel">' + (baseLang === "it" ? "Annulla" : "Cancel") + '</button><button class="primary" id="mdac-service-send"' + (serviceSending ? ' disabled' : '') + '>' + (baseLang === "it" ? "Invia richiesta" : "Send request") + '</button></div></div>';
    }

    // Input area + footer
    html += '<div class="mdac-input-area">';
    html += '<input class="mdac-input" id="mdac-input" placeholder="' + t.placeholder + '" ' + (isLoading ? 'disabled' : '') + ' />';
    html += '<button class="mdac-send" id="mdac-send" ' + (isLoading ? 'disabled' : '') + '>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    html += '</button>';
    html += '</div>';

    // Footer
    html += '<div class="mdac-footer"><span>' + esc(t.aiDisclaimer) + '</span><a href="https://chatbot.your-genius.com" target="_blank" rel="noopener">Chatbot Genius</a></div>';

    html += '</div>'; // end panel

    shadow.innerHTML = html;

    // ── Bind events ───────────────────────────────────────
    var toggleBtn = shadow.getElementById("mdac-toggle");
    var closeBtn = shadow.getElementById("mdac-close");
    var sendBtn = shadow.getElementById("mdac-send");
    var inputEl = shadow.getElementById("mdac-input");
    var messagesEl = shadow.getElementById("mdac-messages");
    var leadSubmitBtn = shadow.getElementById("mdac-lead-submit");
    var calendlyBtn = shadow.getElementById("mdac-calendly");
    var quickBtns = shadow.querySelectorAll(".mdac-quick");
    var serviceCancel = shadow.getElementById("mdac-service-cancel");
    var serviceSend = shadow.getElementById("mdac-service-send");

    if (toggleBtn) toggleBtn.onclick = function () { isOpen = !isOpen; render(); };
    if (closeBtn) closeBtn.onclick = function () { isOpen = false; render(); };
    if (sendBtn) sendBtn.onclick = sendMessage;
    if (inputEl) {
      inputEl.onkeydown = function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
      if (isOpen && !isLoading) setTimeout(function () { inputEl.focus(); }, 50);
    }
    if (leadSubmitBtn) leadSubmitBtn.onclick = submitLead;
    if (calendlyBtn) calendlyBtn.onclick = function () { window.open(config.calendly_url, "_blank"); };
    for (var qb = 0; qb < quickBtns.length; qb++) quickBtns[qb].onclick = function () { serviceCategory = this.getAttribute("data-category") || ""; render(); };
    if (serviceCancel) serviceCancel.onclick = function () { serviceCategory = ""; render(); };
    if (serviceSend) serviceSend.onclick = submitServiceRequest;

    // Scroll to bottom
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

    // Pre-fill lead message
    if (showLeadForm && !leadSent) {
      var msgEl = shadow.getElementById("mdac-lead-message");
      if (msgEl && !msgEl.value) {
        for (var j = messages.length - 1; j >= 0; j--) {
          if (messages[j].role === "user") { msgEl.value = messages[j].content; break; }
        }
      }
    }
  }

  // ── API calls ───────────────────────────────────────────
  function sendMessage() {
    var inputEl = shadow.getElementById("mdac-input");
    if (!inputEl) return;
    var text = inputEl.value.trim();
    if (!text || isLoading) return;

    messages.push({ role: "user", content: text });
    userMessageCount++;
    if (!ROOM && config && config.lead_form_mode === "after_messages" && !leadSent &&
        userMessageCount >= (config.lead_form_message_count || 3)) {
      showLeadForm = true;
    }
    saveMessages(messages);
    isLoading = true;
    render();


    fetch(SUPABASE_URL + "/functions/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        embed_token: EMBED_TOKEN,
        session_token: sessionToken,
        source_url: window.location.href,
        language: widgetLang,
        room: FULLSCREEN ? ROOM : "",
      }),
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(d) { throw d; }).catch(function() { throw { error: "http_error" }; });
      }
      var ct = response.headers.get("content-type") || "";
      if (ct.indexOf("text/event-stream") !== -1) {
        messages.push({ role: "assistant", content: "" });
        var botIdx = messages.length - 1;
        var fullText = "";
        isLoading = false;
        render();
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var lineBuf = "";
        function read() {
          reader.read().then(function(result) {
            if (result.done) {
              var clean = fullText.replace("[TRIGGER_LEAD_FORM]", "").replace(/\[LEAD_DATA:\{[\s\S]*?\}\]/g, "").trim();
              messages[botIdx] = { role: "assistant", content: clean || t.errorReply };
               if (!ROOM && fullText.indexOf("[TRIGGER_LEAD_FORM]") !== -1) showLeadForm = true;
              saveMessages(messages);
              render();
              return;
            }
            lineBuf += decoder.decode(result.value, { stream: true });
            var parts = lineBuf.split("\n");
            lineBuf = parts.pop() || "";
            for (var i = 0; i < parts.length; i++) {
              var line = parts[i].trim();
              if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
              try {
                var parsed = JSON.parse(line.slice(6));
                var delta = (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) || "";
                if (delta) {
                  fullText += delta;
                  messages[botIdx] = { role: "assistant", content: fullText.replace("[TRIGGER_LEAD_FORM]", "").replace(/\[LEAD_DATA:\{[\s\S]*?\}\]/g, "").trim() };
                  render();
                }
              } catch(e) {}
            }
            read();
          }).catch(function() {
            messages[botIdx] = { role: "assistant", content: fullText.replace("[TRIGGER_LEAD_FORM]", "").replace(/\[LEAD_DATA:\{[\s\S]*?\}\]/g, "").trim() || t.errorMsg };
            saveMessages(messages);
            isLoading = false;
            render();
          });
        }
        read();
        return;
      }
      // Fallback: non-streaming JSON response
      return response.json().then(function(data) {
        var botMsg = data.message || t.errorReply;
        messages.push({ role: "assistant", content: botMsg });
         if (!ROOM && data.trigger_lead_form) showLeadForm = true;
        saveMessages(messages);
        isLoading = false;
        render();
      });
    })
    .catch(function(err) {
       if (!ROOM && err && err.error === "plan_limit") {
        showLeadForm = true;
      }
      messages.push({ role: "assistant", content: t.errorMsg });
      saveMessages(messages);
      isLoading = false;
      render();
    });
  }

  function submitServiceRequest() {
    if (!serviceCategory || serviceSending) return;
    var msg = shadow.getElementById("mdac-service-message");
    var name = shadow.getElementById("mdac-service-name");
    serviceSending = true;
    render();
    fetch(SUPABASE_URL + "/functions/v1/create-service-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embed_token: EMBED_TOKEN, room: ROOM, category: serviceCategory, message: msg ? msg.value.trim() : "", guest_name: name ? name.value.trim() : "" }),
    }).then(function (response) {
      if (!response.ok) throw new Error("request_failed");
      messages.push({ role: "assistant", content: baseLang === "it" ? "Richiesta inviata alla reception." : "Request sent to reception." });
      serviceCategory = "";
      serviceSending = false;
      saveMessages(messages);
      render();
    }).catch(function () {
      serviceSending = false;
      messages.push({ role: "assistant", content: t.errorMsg });
      render();
    });
  }

  function submitLead() {
    var nameEl = shadow.getElementById("mdac-lead-name");
    var emailEl = shadow.getElementById("mdac-lead-email");
    var phoneEl = shadow.getElementById("mdac-lead-phone");
    var msgEl = shadow.getElementById("mdac-lead-message");

    if (!nameEl) return;
    var name = nameEl.value.trim();
    var email = emailEl ? emailEl.value.trim() : "";
    var phone = phoneEl ? phoneEl.value.trim() : "";
    if (!name) return;
    if (!email && !phone) return;

    var booking = null;
    if (isHotel()) {
      var inEl = shadow.getElementById("mdac-h-in"), outEl = shadow.getElementById("mdac-h-out");
      var ci = inEl ? inEl.value : "", co = outEl ? outEl.value : "";
      var errEl = shadow.getElementById("mdac-h-err");
      if (!ci || !co || ci < todayIso() || co <= ci) { if (errEl) errEl.style.display = "block"; return; }
      var roomEl = shadow.getElementById("mdac-h-room");
      var adEl = shadow.getElementById("mdac-h-ad"), chEl = shadow.getElementById("mdac-h-ch");
      var roomId = roomEl ? roomEl.value : "";
      var roomName = "";
      if (roomId) { for (var rj = 0; rj < config.hotel.rooms.length; rj++) if (config.hotel.rooms[rj].id === roomId) roomName = config.hotel.rooms[rj].name; }
      booking = {
        check_in: ci, check_out: co,
        adults: Math.max(1, parseInt(adEl && adEl.value, 10) || 2),
        children: Math.max(0, parseInt(chEl && chEl.value, 10) || 0),
        room_id: roomId || null, room_name: roomName || null,
      };
    }

    var lead = {
      name: name,
      email: email,
      phone: phone,
      message: msgEl ? msgEl.value.trim() : "",
    };

    fetch(SUPABASE_URL + "/functions/v1/capture-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({
        embed_token: EMBED_TOKEN,
        session_token: sessionToken,
        lead: lead,
        source_url: window.location.href,
        transcript: messages,
        language: widgetLang,
      }, booking ? { booking: booking } : {})),
    })
      .then(function () {
        if (booking) hotelBookingUrl = buildHotelUrl(booking);
        leadSent = true;
        showLeadForm = false;
        messages.push({ role: "assistant", content: t.thankYou });
        saveMessages(messages);
        render();
      })
      .catch(function () {
        // silent
      });
  }

  // ── Init: fetch config via widget-config function (only display fields) ──
  fetch(SUPABASE_URL + "/functions/v1/widget-config?embed_token=" + encodeURIComponent(EMBED_TOKEN))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || data.error) { console.error("[Genius Widget] Invalid embed token"); return; }
      config = data;

      // Lead form timing: show immediately if configured
       if (!ROOM && config.lead_form_mode === "immediate" && !leadSent) {
        showLeadForm = true;
      }


      // Determine the correct welcome message based on language
      var welcomeMsg;
      if (baseLang === "en") {
        welcomeMsg = config.welcome_msg_en || config.welcome_msg_it || config.welcome_message || "Hello! How can I help you?";
      } else if (baseLang === "it") {
        welcomeMsg = config.welcome_msg_it || config.welcome_message || "Ciao! Come posso aiutarti?";
      } else {
        welcomeMsg = config.welcome_msg_en || config.welcome_msg_it || config.welcome_message || "Hello! How can I help you?";
      }

      // Check if welcome message changed since last session — if so, reset conversation
      var prevWelcome = null;
      try { prevWelcome = sessionStorage.getItem(WELCOME_KEY); } catch(e) {}
      var welcomeChanged = prevWelcome !== null && prevWelcome !== welcomeMsg;

      var saved = loadMessages();
      if (saved && saved.length && !welcomeChanged) {
        messages = saved;
        for (var mi = 0; mi < messages.length; mi++) {
          if (messages[mi] && messages[mi].role === "user") userMessageCount++;
        }
         if (!ROOM && config.lead_form_mode === "after_messages" && !leadSent &&
            userMessageCount >= (config.lead_form_message_count || 3)) {
          showLeadForm = true;
        }
      } else {
        messages = [{ role: "assistant", content: welcomeMsg }];
        saveMessages(messages);
        // Also reset session token so chat history starts fresh
        if (welcomeChanged) {
          sessionStorage.removeItem(SESSION_KEY);
          sessionToken = getSessionToken();
        }
      }

      // Store current welcome message for future change detection
      try { sessionStorage.setItem(WELCOME_KEY, welcomeMsg); } catch(e) {}

      render();
    })
    .catch(function (err) {
      console.error("[Genius Widget] Failed to load config:", err);
    });
})();
