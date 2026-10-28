-- Guest requests become a single conversation thread:
-- the property can reply several times, the guest can answer in the same thread,
-- and a follow-up after a closure reopens the same request.
-- Additive only: no existing column or row is changed or removed.

-- These two columns already exist in the live database (added outside a migration);
-- IF NOT EXISTS aligns the repository without touching existing data.
-- They keep holding the latest staff reply so older widget copies keep working.
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS staff_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_guest_message_at timestamptz;

COMMENT ON COLUMN public.service_requests.last_guest_message_at IS 'Time of the latest guest follow-up forwarded to the staff in the same thread; NULL when the guest never wrote again.';

CREATE TABLE IF NOT EXISTS public.service_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  bot_id uuid NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author text NOT NULL CHECK (author IN ('guest', 'staff')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  closes_request boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_request_messages IS 'Messages exchanged on a guest request after its creation: staff replies and guest follow-ups. The original request text stays in service_requests.message.';

CREATE INDEX IF NOT EXISTS service_request_messages_request_idx
  ON public.service_request_messages (request_id, created_at);
CREATE INDEX IF NOT EXISTS service_request_messages_bot_created_idx
  ON public.service_request_messages (bot_id, created_at DESC);

ALTER TABLE public.service_request_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.service_request_messages TO authenticated;
GRANT ALL ON public.service_request_messages TO service_role;

CREATE POLICY "Clients can view own request messages"
ON public.service_request_messages FOR SELECT TO authenticated
USING (client_id = public.get_user_client_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

-- The property writes staff messages from the dashboard; guest messages are
-- written only by edge functions with the service role.
CREATE POLICY "Clients can add staff messages to own requests"
ON public.service_request_messages FOR INSERT TO authenticated
WITH CHECK (
  author = 'staff'
  AND (client_id = public.get_user_client_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
  AND EXISTS (
    SELECT 1 FROM public.service_requests r
    WHERE r.id = request_id AND r.client_id = service_request_messages.client_id AND r.bot_id = service_request_messages.bot_id
  )
);

ALTER TABLE public.service_request_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'service_request_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_request_messages;
  END IF;
END $$;

-- Keep the replies already sent: copy each existing staff_reply as the first staff message.
INSERT INTO public.service_request_messages (request_id, bot_id, client_id, author, body, created_at)
SELECT r.id, r.bot_id, r.client_id, 'staff', left(btrim(r.staff_reply), 1000), COALESCE(r.replied_at, r.created_at)
FROM public.service_requests r
WHERE r.staff_reply IS NOT NULL AND btrim(r.staff_reply) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.service_request_messages m WHERE m.request_id = r.id);
