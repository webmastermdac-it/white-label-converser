# Architecture Rules

- Client sidebar shows only universal items; module menu pages (activeModule.menu) render inside the per-bot "Concierge" tab of ClientChatbotSettings via an href→component map, so modules stay per-bot.