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

  // ── Detect script tag & token ───────────────────────────
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();
  var EMBED_TOKEN = scriptTag.getAttribute("data-token");
  if (!EMBED_TOKEN) { console.error("[MDAC Widget] Missing data-token"); return; }

  // ── Supabase URL (same origin as widget or infer from script src) ──
  var SUPABASE_URL = (function () {
    var src = scriptTag.getAttribute("src") || "";
    try {
      var u = new URL(src, window.location.origin);
      // If served from lovable preview or custom domain, use project URL
      return "https://hbzgpxaxrqbbvcyvklln.supabase.co";
    } catch (e) {
      return "https://hbzgpxaxrqbbvcyvklln.supabase.co";
    }
  })();

  // ── Session ─────────────────────────────────────────────
  var SESSION_KEY = "mdac_widget_session_" + EMBED_TOKEN;
  var MSG_KEY = "mdac_widget_msgs_" + EMBED_TOKEN;

  function getSessionToken() {
    var t = sessionStorage.getItem(SESSION_KEY);
    if (!t) { t = uuidv4(); sessionStorage.setItem(SESSION_KEY, t); }
    return t;
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
  host.id = "mdac-chat-widget";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "closed" });

  // ── Styles ──────────────────────────────────────────────
  function buildStyles(cfg) {
    var pc = cfg.primary_color || "#E94560";
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
.mdac-msg.bot .mdac-msg-avatar{background:#e5e7eb;}\
.mdac-msg.user .mdac-msg-avatar{background:" + pc + ";color:#fff;font-size:12px;}\
.mdac-typing{display:flex;gap:4px;padding:10px 14px;}\
.mdac-dot{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:mdac-bounce .6s infinite alternate;}\
.mdac-dot:nth-child(2){animation-delay:.15s;}\
.mdac-dot:nth-child(3){animation-delay:.3s;}\
@keyframes mdac-bounce{to{transform:translateY(-6px);opacity:.4;}}\
.mdac-input-area{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e5e7eb;background:#fff;}\
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

    var pc = config.primary_color || "#E94560";
    var avatar = config.avatar || "🤖";

    var html = '<style>' + buildStyles(config) + '</style>';

    // Launcher
    html += '<button class="mdac-launcher" id="mdac-toggle">' + esc(avatar) + '</button>';

    // Panel
    html += '<div class="mdac-panel' + (isOpen ? ' open' : '') + '" id="mdac-panel">';

    // Header
    html += '<div class="mdac-header">';
    html += '<div class="mdac-header-avatar">' + esc(avatar) + '</div>';
    html += '<div class="mdac-header-info"><div class="mdac-header-name">' + esc(config.name || "Assistente") + '</div><div class="mdac-header-powered">Powered by MDAC</div></div>';
    html += '<button class="mdac-close" id="mdac-close">&times;</button>';
    html += '</div>';

    // Messages
    html += '<div class="mdac-messages" id="mdac-messages">';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var cls = m.role === "user" ? "user" : "bot";
      html += '<div class="mdac-msg ' + cls + '">';
      if (m.role !== "user") {
        html += '<div class="mdac-msg-avatar">' + esc(avatar) + '</div>';
      }
      html += '<div class="mdac-bubble">' + esc(m.content) + '</div>';
      if (m.role === "user") {
        html += '<div class="mdac-msg-avatar">👤</div>';
      }
      html += '</div>';
    }

    // Typing indicator
    if (isLoading) {
      html += '<div class="mdac-msg bot"><div class="mdac-msg-avatar">' + esc(avatar) + '</div><div class="mdac-bubble"><div class="mdac-typing"><div class="mdac-dot"></div><div class="mdac-dot"></div><div class="mdac-dot"></div></div></div></div>';
    }

    // Lead form
    if (showLeadForm && !leadSent) {
      html += '<div class="mdac-lead-form" id="mdac-lead-form">';
      html += '<label>📋 Lascia i tuoi contatti</label>';
      html += '<input type="text" id="mdac-lead-name" placeholder="Nome *" />';
      html += '<input type="email" id="mdac-lead-email" placeholder="Email *" />';
      html += '<input type="tel" id="mdac-lead-phone" placeholder="Telefono" />';
      html += '<textarea id="mdac-lead-message" placeholder="Messaggio"></textarea>';
      html += '<button class="mdac-lead-btn" id="mdac-lead-submit">Invia richiesta</button>';
      if (config.calendly_url) {
        html += '<button class="mdac-calendly" id="mdac-calendly">📅 Prenota una consulenza</button>';
      }
      html += '</div>';
    }

    if (leadSent) {
      html += '<div class="mdac-success">✅ Richiesta inviata! Ti contatteremo presto.</div>';
    }

    html += '</div>'; // end messages

    // Input area
    html += '<div class="mdac-input-area">';
    html += '<input class="mdac-input" id="mdac-input" placeholder="Scrivi un messaggio..." ' + (isLoading ? 'disabled' : '') + ' />';
    html += '<button class="mdac-send" id="mdac-send" ' + (isLoading ? 'disabled' : '') + '>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    html += '</button>';
    html += '</div>';

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
      // Auto-focus when open
      if (isOpen && !isLoading) setTimeout(function () { inputEl.focus(); }, 50);
    }
    if (leadSubmitBtn) leadSubmitBtn.onclick = submitLead;
    if (calendlyBtn) calendlyBtn.onclick = function () { window.open(config.calendly_url, "_blank"); };

    // Scroll to bottom
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

    // Pre-fill lead message with last user message
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
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var botMsg = data.message || "Errore nella risposta.";
        messages.push({ role: "assistant", content: botMsg });

        // Fallback detection
        if (data.trigger_lead_form ||
          /non ho (questa )?informazion/i.test(botMsg) ||
          /non so rispondere/i.test(botMsg) ||
          /contatt/i.test(botMsg) ||
          /non sono in grado/i.test(botMsg)) {
          showLeadForm = true;
        }

        saveMessages(messages);
        isLoading = false;
        render();
      })
      .catch(function () {
        messages.push({ role: "assistant", content: "Errore di connessione. Riprova." });
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
      }),
    })
      .then(function () {
        leadSent = true;
        showLeadForm = false;
        messages.push({ role: "assistant", content: "Grazie! Ti contatteremo presto. 🎉" });
        saveMessages(messages);
        render();
      })
      .catch(function () {
        // silent
      });
  }

  // ── Init: fetch config ──────────────────────────────────
  fetch(SUPABASE_URL + "/rest/v1/chatbot_configs?embed_token=eq." + encodeURIComponent(EMBED_TOKEN) + "&select=*&limit=1", {
    headers: {
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiemdweGF4cnFiYnZjeXZrbGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTA3MzEsImV4cCI6MjA4NzAyNjczMX0.ngGgUexd_CYOHtDEyZCd7Cs_XA-EimDAyuguuLgSCUk",
      "Content-Type": "application/json",
    },
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.length) { console.error("[MDAC Widget] Invalid embed token"); return; }
      config = data[0];

      // Restore messages from sessionStorage or start with welcome
      var saved = loadMessages();
      if (saved && saved.length) {
        messages = saved;
      } else {
        messages = [{ role: "assistant", content: config.welcome_message || "Ciao! Come posso aiutarti?" }];
        saveMessages(messages);
      }

      render();
    })
    .catch(function (err) {
      console.error("[MDAC Widget] Failed to load config:", err);
    });
})();
