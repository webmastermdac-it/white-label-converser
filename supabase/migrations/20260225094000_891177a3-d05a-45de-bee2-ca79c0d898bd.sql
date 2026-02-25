
-- Brand settings table for logo and primary color
CREATE TABLE public.brand_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url text,
  app_name text NOT NULL DEFAULT 'Genius Chatbot',
  primary_color text NOT NULL DEFAULT '#1A1A1A',
  footer_text text DEFAULT 'Genius Chatbot Builder — Un prodotto MDAC S.r.l.',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read brand settings"
ON public.brand_settings FOR SELECT USING (true);

CREATE POLICY "Super admins can manage brand settings"
ON public.brand_settings FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default row
INSERT INTO public.brand_settings (app_name, primary_color) VALUES ('Genius Chatbot', '#1A1A1A');

-- Create trigger for updated_at
CREATE TRIGGER update_brand_settings_updated_at
BEFORE UPDATE ON public.brand_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for brand assets (logo)
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true);

CREATE POLICY "Anyone can view brand assets"
ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets');

CREATE POLICY "Super admins can upload brand assets"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update brand assets"
ON storage.objects FOR UPDATE USING (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete brand assets"
ON storage.objects FOR DELETE USING (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'super_admin'::app_role));
