CREATE TABLE public.setup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','contacted','in_progress','completed','cancelled')),
  phone text NOT NULL,
  notes text,
  admin_notes text,
  amount_cents integer NOT NULL DEFAULT 50000,
  currency text NOT NULL DEFAULT 'eur',
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX setup_requests_client_id_idx ON public.setup_requests(client_id);
GRANT SELECT, UPDATE ON public.setup_requests TO authenticated;
GRANT ALL ON public.setup_requests TO service_role;
ALTER TABLE public.setup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients view own setup requests" ON public.setup_requests
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "Super admins view all setup requests" ON public.setup_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update setup requests" ON public.setup_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER update_setup_requests_updated_at BEFORE UPDATE ON public.setup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();