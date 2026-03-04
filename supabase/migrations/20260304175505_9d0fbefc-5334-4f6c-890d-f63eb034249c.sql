CREATE TABLE public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding_provider text NOT NULL DEFAULT 'openai',
  embedding_dimensions integer NOT NULL DEFAULT 1536,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage ai_settings" ON public.ai_settings FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Edge functions can read ai_settings" ON public.ai_settings FOR SELECT USING (true);

INSERT INTO public.ai_settings (embedding_provider, embedding_dimensions) VALUES ('openai', 1536);