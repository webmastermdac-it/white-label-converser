ALTER TABLE public.plan_configs
  ADD COLUMN IF NOT EXISTS concierge_requests boolean NOT NULL DEFAULT false;

UPDATE public.plan_configs
SET concierge_requests = (plan_name = 'pro');

COMMENT ON COLUMN public.plan_configs.concierge_requests IS 'Enables in-stay hotel concierge service requests and QR management.';

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  room text NOT NULL,
  category text NOT NULL,
  message text,
  guest_name text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

GRANT SELECT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own service requests"
ON public.service_requests FOR SELECT TO authenticated
USING (client_id = public.get_user_client_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Clients can update own service requests"
ON public.service_requests FOR UPDATE TO authenticated
USING (client_id = public.get_user_client_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (client_id = public.get_user_client_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Clients can delete own service requests"
ON public.service_requests FOR DELETE TO authenticated
USING (client_id = public.get_user_client_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX service_requests_bot_status_created_idx
ON public.service_requests (bot_id, status, created_at DESC);

CREATE INDEX service_requests_rate_limit_idx
ON public.service_requests (bot_id, room, created_at DESC);

ALTER TABLE public.service_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'service_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
  END IF;
END $$;