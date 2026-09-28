# Architecture Rules

- Client sidebar shows only universal items; per-bot settings use query-backed hub sections, and activeModule.menu renders only inside the conditional Concierge section via an href→component map.
- Tone of voice lives in chatbot_configs.tone_of_voice/tone_preset_id (own card in ClientRAGKnowledgeBase), prepended to the chat system prompt; instructions stay free text without tone parsing.- Bot module (business_vertical) is set at creation and changed only via BotModuleCard by super_admin/adminMode; Appearance never writes it — avoids accidental module switches.
