
ALTER TABLE public.chatbot_configs
  ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
  ADD COLUMN IF NOT EXISTS instagram_page_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_username TEXT,
  ADD COLUMN IF NOT EXISTS instagram_connected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_connected_at TIMESTAMPTZ;

ALTER TABLE public.plan_configs
  ADD COLUMN IF NOT EXISTS instagram_integration BOOLEAN NOT NULL DEFAULT false;

UPDATE public.plan_configs SET instagram_integration = true WHERE plan_name = 'pro';

CREATE TABLE IF NOT EXISTS public.instagram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  bot_id UUID,
  instagram_sender_id TEXT,
  instagram_sender_username TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_client ON public.instagram_messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_configs_ig_page ON public.chatbot_configs(instagram_page_id);

ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own instagram messages"
ON public.instagram_messages FOR SELECT
USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Super admins can manage all instagram messages"
ON public.instagram_messages FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Edge functions can insert instagram messages"
ON public.instagram_messages FOR INSERT
WITH CHECK (true);
