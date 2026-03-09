
-- 1. Add is_platform_bot column to chatbot_configs
ALTER TABLE public.chatbot_configs 
ADD COLUMN IF NOT EXISTS is_platform_bot boolean NOT NULL DEFAULT false;

-- 2. Create a system client for the platform bot
INSERT INTO public.clients (id, name, email, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Genius Platform', 'platform@chatbot.your-genius.com', 'pro')
ON CONFLICT (id) DO NOTHING;

-- 3. Create the platform bot
INSERT INTO public.chatbot_configs (
  id, client_id, name, is_platform_bot, is_active,
  knowledge_base,
  welcome_msg_it, welcome_msg_en,
  fallback_msg_it, fallback_msg_en,
  primary_color, background_color, text_color, avatar
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Genius Assistant',
  true,
  true,
  'You are Genius Assistant, the virtual assistant of Chatbot Genius — a white-label chatbot SaaS. Help visitors understand the platform features, pricing plans (Free, Starter, Pro), and how to get started. Always be helpful, professional and concise.',
  'Ciao! Sono Genius Assistant 🚀 Come posso aiutarti a scoprire la nostra piattaforma?',
  'Hi! I''m Genius Assistant 🚀 How can I help you learn about our platform?',
  'Non ho questa informazione specifica, ma puoi contattarci a info@your-genius.com per maggiori dettagli!',
  'I don''t have that specific information, but you can contact us at info@your-genius.com for more details!',
  '#E94560',
  '#1A1A2E',
  '#FFFFFF',
  '🧞'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Update RLS: Exclude platform bot from client-facing queries
DROP POLICY IF EXISTS "Clients can view and update their own chatbot" ON public.chatbot_configs;
CREATE POLICY "Clients can view and update their own chatbot"
ON public.chatbot_configs
FOR SELECT
TO public
USING (
  client_id = get_user_client_id(auth.uid())
  AND is_platform_bot = false
);

DROP POLICY IF EXISTS "Clients can update their own chatbot" ON public.chatbot_configs;
CREATE POLICY "Clients can update their own chatbot"
ON public.chatbot_configs
FOR UPDATE
TO public
USING (
  client_id = get_user_client_id(auth.uid())
  AND is_platform_bot = false
);
