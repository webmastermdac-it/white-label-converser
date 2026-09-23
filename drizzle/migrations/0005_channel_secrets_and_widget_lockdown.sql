DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='chatbot_configs' AND cmd='SELECT' AND 'anon' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY %I ON public.chatbot_configs', p.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Clients can view and update their own chatbot" ON public.chatbot_configs;
CREATE POLICY "Clients can view and update their own chatbot" ON public.chatbot_configs
  FOR SELECT TO authenticated
  USING (client_id = get_user_client_id(auth.uid()) AND is_platform_bot = false);

CREATE TABLE public.channel_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  channel text NOT NULL,
  access_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, channel)
);
GRANT ALL ON public.channel_secrets TO service_role;
REVOKE ALL ON public.channel_secrets FROM anon, authenticated;
ALTER TABLE public.channel_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.channel_secrets (bot_id, channel, access_token)
SELECT id, 'instagram', instagram_access_token FROM public.chatbot_configs
WHERE instagram_access_token IS NOT NULL
ON CONFLICT (bot_id, channel) DO NOTHING;

UPDATE public.chatbot_configs SET instagram_access_token = NULL WHERE instagram_access_token IS NOT NULL;
COMMENT ON COLUMN public.chatbot_configs.instagram_access_token IS 'DEPRECATED: moved to channel_secrets (service role only). Always NULL.';