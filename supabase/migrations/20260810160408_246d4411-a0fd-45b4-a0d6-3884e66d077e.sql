ALTER TABLE public.chatbot_configs
  ALTER COLUMN welcome_msg_it SET DEFAULT 'Ciao! Sono un assistente virtuale basato su intelligenza artificiale. Come posso aiutarti?',
  ALTER COLUMN welcome_msg_en SET DEFAULT 'Hello! I''m an AI-based virtual assistant. How can I help you?';