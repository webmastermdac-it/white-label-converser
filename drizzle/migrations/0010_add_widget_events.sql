CREATE TABLE public.widget_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  event text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.widget_events TO authenticated;
GRANT ALL ON public.widget_events TO service_role;
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients view own widget events" ON public.widget_events FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Super admins view all widget events" ON public.widget_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX widget_events_bot_time_idx ON public.widget_events (bot_id, event, created_at);
CREATE INDEX widget_events_session_time_idx ON public.widget_events (session_id, created_at);