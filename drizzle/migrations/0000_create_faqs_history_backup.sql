CREATE TABLE public.faqs_history (
  id uuid primary key default gen_random_uuid(),
  faq_id uuid,
  chatbot_id uuid,
  question text,
  answer text,
  action text,
  changed_at timestamptz not null default now()
);

GRANT SELECT ON public.faqs_history TO authenticated;
GRANT ALL ON public.faqs_history TO service_role;

ALTER TABLE public.faqs_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read all faqs history"
  ON public.faqs_history
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Clients can read their own faqs history"
  ON public.faqs_history
  FOR SELECT
  TO authenticated
  USING (
    chatbot_id IN (
      SELECT chatbot_configs.id
      FROM public.chatbot_configs
      WHERE chatbot_configs.client_id = get_user_client_id(auth.uid())
        AND chatbot_configs.is_platform_bot = false
    )
  );

CREATE OR REPLACE FUNCTION public.log_faq_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.faqs_history (faq_id, chatbot_id, question, answer, action)
  VALUES (
    OLD.id,
    OLD.chatbot_id,
    OLD.question,
    OLD.answer,
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'update' END
  );
  RETURN OLD;
END;
$function$;

CREATE TRIGGER faqs_history_backup
  BEFORE UPDATE OR DELETE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_faq_history();