ALTER TABLE public.chatbot_configs
  ADD COLUMN IF NOT EXISTS welcome_msg_it text DEFAULT 'Ciao! Come posso aiutarti?',
  ADD COLUMN IF NOT EXISTS welcome_msg_en text DEFAULT 'Hello! How can I help you?';