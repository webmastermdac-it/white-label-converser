
-- Add language column to leads and chat_sessions
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS language text DEFAULT 'it';
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS language text DEFAULT 'it';

-- Add bilingual fallback message fields to chatbot_configs
ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS fallback_msg_it text DEFAULT 'Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!';
ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS fallback_msg_en text DEFAULT 'I don''t have this information, but I can connect you with one of our consultants!';
