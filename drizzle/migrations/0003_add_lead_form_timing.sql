ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS lead_form_mode text NOT NULL DEFAULT 'smart';
ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS lead_form_message_count integer NOT NULL DEFAULT 3;

DROP FUNCTION IF EXISTS public.get_widget_config(text);

CREATE OR REPLACE FUNCTION public.get_widget_config(_embed_token text)
 RETURNS TABLE(id uuid, name text, avatar text, primary_color text, background_color text, text_color text, circle_color text, launcher_position text, welcome_message text, welcome_msg_it text, welcome_msg_en text, calendly_url text, lead_form_mode text, lead_form_message_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.name, c.avatar, c.primary_color, c.background_color, c.text_color,
         c.circle_color, c.launcher_position, c.welcome_message,
         c.welcome_msg_it, c.welcome_msg_en, c.calendly_url,
         c.lead_form_mode, c.lead_form_message_count
  FROM public.chatbot_configs c
  WHERE c.embed_token = _embed_token
    AND c.is_active = true
  LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.get_widget_config(text) TO anon, authenticated, service_role;