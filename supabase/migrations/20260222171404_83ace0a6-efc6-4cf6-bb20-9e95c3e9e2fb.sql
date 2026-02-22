
-- Create plan_configs table
CREATE TABLE public.plan_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL UNIQUE,
  price_monthly integer NOT NULL DEFAULT 0,
  price_yearly integer NOT NULL DEFAULT 0,
  max_chatbots integer NOT NULL DEFAULT 1,
  max_conversations_month integer NOT NULL DEFAULT 50,
  max_leads_month integer NOT NULL DEFAULT 10,
  remove_branding boolean NOT NULL DEFAULT false,
  doc_upload boolean NOT NULL DEFAULT false,
  sector_templates boolean NOT NULL DEFAULT false,
  calendly_integration boolean NOT NULL DEFAULT false,
  advanced_analytics boolean NOT NULL DEFAULT false,
  priority_support boolean NOT NULL DEFAULT false,
  knowledge_base_wizard boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read
CREATE POLICY "Super admins can read plan configs"
ON public.plan_configs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can update
CREATE POLICY "Super admins can update plan configs"
ON public.plan_configs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can insert
CREATE POLICY "Super admins can insert plan configs"
ON public.plan_configs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone authenticated can read (needed for usePlanConfig hook)
CREATE POLICY "Authenticated users can read plan configs"
ON public.plan_configs FOR SELECT
TO authenticated
USING (true);

-- Seed data
INSERT INTO public.plan_configs (plan_name, price_monthly, price_yearly, max_chatbots, max_conversations_month, max_leads_month, remove_branding, doc_upload, sector_templates, calendly_integration, advanced_analytics, priority_support, knowledge_base_wizard)
VALUES
('free', 0, 0, 1, 50, 10, false, false, false, false, false, false, false),
('starter', 4900, 49000, 1, 500, -1, true, true, true, true, false, true, true),
('pro', 14900, 149000, -1, -1, -1, true, true, true, true, true, true, true);

-- Updated_at trigger
CREATE TRIGGER update_plan_configs_updated_at
  BEFORE UPDATE ON public.plan_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
