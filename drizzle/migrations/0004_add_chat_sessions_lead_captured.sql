ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS lead_captured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.chatbot_configs.lead_form_mode IS 'immediate | after_messages | smart | conversational';