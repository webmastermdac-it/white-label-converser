# Architecture Rules

- Client sidebar shows only universal items; module menu pages (activeModule.menu) render inside the per-bot "Concierge" tab of ClientChatbotSettings via an href→component map, so modules stay per-bot.
- Bot instructions use StructuredSections inside ClientRAGKnowledgeBase, serializing named sections back into chatbot_configs.knowledge_base so legacy free text remains preserved.