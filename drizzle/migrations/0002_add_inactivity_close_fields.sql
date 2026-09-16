ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS inactivity_timeout_minutes integer NOT NULL DEFAULT 30;
ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS notify_new_chat_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now();
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;