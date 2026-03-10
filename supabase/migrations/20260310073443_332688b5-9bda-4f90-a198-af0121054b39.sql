
-- Add site_url column to chatbot_configs
ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS site_url text DEFAULT '';

-- Update Starter plan to allow 3 chatbots
UPDATE public.plan_configs SET max_chatbots = 3 WHERE plan_name = 'starter';
