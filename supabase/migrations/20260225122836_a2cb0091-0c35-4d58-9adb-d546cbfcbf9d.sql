
-- Email templates table
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL UNIQUE CHECK (type IN ('welcome', 'reset_password', 'chatbot_notification', 'weekly_summary')),
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage email templates"
ON public.email_templates FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Edge functions can read email templates"
ON public.email_templates FOR SELECT USING (true);

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Email template audit logs
CREATE TABLE public.email_template_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  old_subject text,
  new_subject text,
  old_html_body text,
  new_html_body text
);

ALTER TABLE public.email_template_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage email template logs"
ON public.email_template_logs FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
