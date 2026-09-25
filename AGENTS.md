# Architecture Rules

- Client sidebar shows only universal items; module menu pages (activeModule.menu) render inside the per-bot "Concierge" tab of ClientChatbotSettings via an href→component map, so modules stay per-bot.
- Tone of voice lives in chatbot_configs.tone_of_voice/tone_preset_id (own card in ClientRAGKnowledgeBase), prepended to the chat system prompt; instructions stay free text without tone parsing.