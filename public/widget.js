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
      .replace(/\n/g, '<br>');
  }

  // ── Language detection (full code) ─────────────────────
  var widgetLang = navigator.language || "en";
  var baseLang = widgetLang.substring(0, 2);

  // ── Multi-language form labels ─────────────────────────
  var formLabels = {
    en: {
      placeholder: "Type a message...",
      leadLabel: "📋 Leave your contact details",
      namePlaceholder: "Name *",
      emailPlaceholder: "Email *",
      phonePlaceholder: "Phone",
      messagePlaceholder: "Message",
      submitBtn: "Submit request",
      calendlyBtn: "📅 Book a consultation",
      successMsg: "✅ Request sent! We'll contact you soon.",
      thankYou: "Thank you! We'll contact you soon. 🎉",
      errorMsg: "Connection error. Please retry.",
      errorReply: "Error in the response.",
    },
    it: {
      placeholder: "Scrivi un messaggio...",
      leadLabel: "📋 Lascia i tuoi contatti",
      namePlaceholder: "Nome *",
      emailPlaceholder: "Email *",
      phonePlaceholder: "Telefono",
      messagePlaceholder: "Messaggio",
      submitBtn: "Invia richiesta",
      calendlyBtn: "📅 Prenota una consulenza",
      successMsg: "✅ Richiesta inviata! Ti contatteremo presto.",
      thankYou: "Grazie! Ti contatteremo presto. 🎉",
      errorMsg: "Errore di connessione. Riprova.",
      errorReply: "Errore nella risposta.",
    },
    fr: {
      placeholder: "Écrivez un message...",
      leadLabel: "📋 Laissez vos coordonnées",
      namePlaceholder: "Nom *",
      emailPlaceholder: "Email *",
      phonePlaceholder: "Téléphone",
      messagePlaceholder: "Message",
      submitBtn: "Envoyer",
      calendlyBtn: "📅 Réserver une consultation",
      successMsg: "✅ Demande envoyée! Nous vous contacterons.",
      thankYou: "Merci! Nous vous contacterons bientôt. 🎉",
      errorMsg: "Erreur de connexion. Réessayez.",
      errorReply: "Erreur dans la réponse.",
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
    },
  };

  var t = formLabels[baseLang] || formLabels["en"];

  // ── Detect script tag & token ───────────────────────────
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();
  var EMBED_TOKEN = scriptTag.getAttribute("data-token");
  if (!EMBED_TOKEN) { console.error("[Genius Widget] Missing data-token"); return; }

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
  var isOpen = false;
  var isLoading = false;
  var showLeadForm = false;
  var leadSent = false;

  // ── Create Shadow DOM ───────────────────────────────────
  var host = document.createElement("div");
  host.id = "genius-chat-widget";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "closed" });

  // ── Styles ──────────────────────────────────────────────
  function buildStyles(cfg) {
    var pc = cfg.primary_color || "#F59E0B";
    var bg = cfg.background_color || "#1A1A2E";
    var tc = cfg.text_color || "#FFFFFF";
    var pos = cfg.launcher_position === "bottom-left" ? "left:20px;" : "right:20px;";

    return "\
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}\
.mdac-launcher{position:fixed;bottom:20px;" + pos + "width:60px;height:60px;border-radius:50%;background:" + pc + ";color:#fff;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:28px;transition:transform .2s,box-shadow .2s;z-index:1;}\
.mdac-launcher:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(0,0,0,.35);}\
.mdac-panel{position:fixed;bottom:90px;" + pos + "width:370px;height:520px;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 48px rgba(0,0,0,.3);opacity:0;transform:translateY(20px) scale(.95);pointer-events:none;transition:opacity .25s ease,transform .25s ease;z-index:2;background:#fff;}\
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
.mdac-msg.bot .mdac-msg-avatar{background:#e5e7eb;}\
.mdac-msg.user .mdac-msg-avatar{background:" + pc + ";color:#fff;font-size:12px;}\
.mdac-typing{display:flex;gap:4px;padding:10px 14px;}\
.mdac-dot{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:mdac-bounce .6s infinite alternate;}\
.mdac-dot:nth-child(2){animation-delay:.15s;}\
.mdac-dot:nth-child(3){animation-delay:.3s;}\
@keyframes mdac-bounce{to{transform:translateY(-6px);opacity:.4;}}\
.mdac-input-area{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e5e7eb;background:#fff;}\
.mdac-footer{text-align:center;padding:4px 0 6px;background:#fff;border-top:1px solid #f3f4f6;}\
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
.mdac-panel{width:100%;height:70vh;bottom:0;left:0;right:0;border-radius:16px 16px 0 0;}\
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
    var genieImgTag = '<img src="' + (scriptTag.src ? new URL("/images/genius-icon.png", scriptTag.src).href : "/images/genius-icon.png") + '" style="width:28px;height:28px;" alt="Genius" />';
    var avatarDisplay = isGenie ? genieImgTag : esc(avatar);
    var avatarSmall = isGenie ? '<img src="' + (scriptTag.src ? new URL("/images/genius-icon.png", scriptTag.src).href : "/images/genius-icon.png") + '" style="width:18px;height:18px;" alt="G" />' : esc(avatar);

    var html = '<style>' + buildStyles(config) + '</style>';

    // Launcher
    html += '<button class="mdac-launcher" id="mdac-toggle">' + avatarDisplay + '</button>';

    // Panel
    html += '<div class="mdac-panel' + (isOpen ? ' open' : '') + '" id="mdac-panel">';

    // Header
    html += '<div class="mdac-header">';
    html += '<div class="mdac-header-avatar">' + avatarDisplay + '</div>';
    html += '<div class="mdac-header-info"><div class="mdac-header-name">' + esc(config.name || "Assistente") + '</div><div class="mdac-header-powered">Powered by Genius</div></div>';
    html += '<button class="mdac-close" id="mdac-close">&times;</button>';
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
      html += '<input type="text" id="mdac-lead-name" placeholder="' + t.namePlaceholder + '" />';
      html += '<input type="email" id="mdac-lead-email" placeholder="' + t.emailPlaceholder + '" />';
      html += '<input type="tel" id="mdac-lead-phone" placeholder="' + t.phonePlaceholder + '" />';
      html += '<textarea id="mdac-lead-message" placeholder="' + t.messagePlaceholder + '"></textarea>';
      html += '<button class="mdac-lead-btn" id="mdac-lead-submit">' + t.submitBtn + '</button>';
      if (config.calendly_url) {
        html += '<button class="mdac-calendly" id="mdac-calendly">' + t.calendlyBtn + '</button>';
      }
      html += '</div>';
    }

    if (leadSent) {
      html += '<div class="mdac-success">' + t.successMsg + '</div>';
    }

    html += '</div>'; // end messages

    // Input area + footer
    html += '<div class="mdac-input-area">';
    html += '<input class="mdac-input" id="mdac-input" placeholder="' + t.placeholder + '" ' + (isLoading ? 'disabled' : '') + ' />';
    html += '<button class="mdac-send" id="mdac-send" ' + (isLoading ? 'disabled' : '') + '>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    html += '</button>';
    html += '</div>';

    // Footer
    html += '<div class="mdac-footer"><a href="https://chatbot.your-genius.com" target="_blank" rel="noopener">Genius Chatbot</a></div>';

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

    if (toggleBtn) toggleBtn.onclick = function () { isOpen = !isOpen; render(); };
    if (closeBtn) closeBtn.onclick = function () { isOpen = false; render(); };
    if (sendBtn) sendBtn.onclick = sendMessage;
    if (inputEl) {
      inputEl.onkeydown = function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
      if (isOpen && !isLoading) setTimeout(function () { inputEl.focus(); }, 50);
    }
    if (leadSubmitBtn) leadSubmitBtn.onclick = submitLead;
    if (calendlyBtn) calendlyBtn.onclick = function () { window.open(config.calendly_url, "_blank"); };

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
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var botMsg = data.message || t.errorReply;
        messages.push({ role: "assistant", content: botMsg });

        if (data.trigger_lead_form) {
          showLeadForm = true;
        }

        saveMessages(messages);
        isLoading = false;
        render();
      })
      .catch(function () {
        messages.push({ role: "assistant", content: t.errorMsg });
        saveMessages(messages);
        isLoading = false;
        render();
      });
  }

  function submitLead() {
    var nameEl = shadow.getElementById("mdac-lead-name");
    var emailEl = shadow.getElementById("mdac-lead-email");
    var phoneEl = shadow.getElementById("mdac-lead-phone");
    var msgEl = shadow.getElementById("mdac-lead-message");

    if (!nameEl || !emailEl) return;
    var name = nameEl.value.trim();
    var email = emailEl.value.trim();
    if (!name || !email) return;

    var lead = {
      name: name,
      email: email,
      phone: phoneEl ? phoneEl.value.trim() : "",
      message: msgEl ? msgEl.value.trim() : "",
    };

    fetch(SUPABASE_URL + "/functions/v1/capture-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embed_token: EMBED_TOKEN,
        session_token: sessionToken,
        lead: lead,
        source_url: window.location.href,
        transcript: messages,
        language: widgetLang,
      }),
    })
      .then(function () {
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

  // ── Init: fetch config ──────────────────────────────────
  fetch(SUPABASE_URL + "/rest/v1/chatbot_configs?embed_token=eq." + encodeURIComponent(EMBED_TOKEN) + "&select=*,welcome_msg_it,welcome_msg_en&limit=1", {
    headers: {
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiemdweGF4cnFiYnZjeXZrbGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTA3MzEsImV4cCI6MjA4NzAyNjczMX0.ngGgUexd_CYOHtDEyZCd7Cs_XA-EimDAyuguuLgSCUk",
      "Content-Type": "application/json",
    },
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.length) { console.error("[Genius Widget] Invalid embed token"); return; }
      config = data[0];

      var saved = loadMessages();
      if (saved && saved.length) {
        messages = saved;
      } else {
        var welcomeMsg;
        if (baseLang === "en") {
          welcomeMsg = config.welcome_msg_en || config.welcome_msg_it || config.welcome_message || "Hello! How can I help you?";
        } else if (baseLang === "it") {
          welcomeMsg = config.welcome_msg_it || config.welcome_message || "Ciao! Come posso aiutarti?";
        } else {
          // For other languages, prefer English welcome then Italian
          welcomeMsg = config.welcome_msg_en || config.welcome_msg_it || config.welcome_message || "Hello! How can I help you?";
        }
        messages = [{ role: "assistant", content: welcomeMsg }];
        saveMessages(messages);
      }

      render();
    })
    .catch(function (err) {
      console.error("[Genius Widget] Failed to load config:", err);
    });
})();
