
-- Create FAQs table
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id uuid NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- RLS: Clients manage their own FAQs
CREATE POLICY "Clients can manage their own FAQs"
ON public.faqs FOR ALL TO public
USING (chatbot_id IN (
  SELECT id FROM public.chatbot_configs
  WHERE client_id = get_user_client_id(auth.uid()) AND is_platform_bot = false
));

-- RLS: Super admins manage all FAQs
CREATE POLICY "Super admins can manage all FAQs"
ON public.faqs FOR ALL TO public
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: Edge functions / anon can read FAQs for active bots
CREATE POLICY "Anon can read FAQs"
ON public.faqs FOR SELECT TO anon
USING (true);

-- Add max_documents to plan_configs
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS max_documents integer NOT NULL DEFAULT -1;

-- Update plan defaults
UPDATE public.plan_configs SET max_faqs = 5, max_documents = 0 WHERE plan_name = 'free';
UPDATE public.plan_configs SET max_faqs = 20, max_documents = 3 WHERE plan_name = 'starter';
UPDATE public.plan_configs SET max_faqs = -1, max_documents = -1, max_chatbots = 30 WHERE plan_name = 'pro';

-- Trigger for updated_at on faqs
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
