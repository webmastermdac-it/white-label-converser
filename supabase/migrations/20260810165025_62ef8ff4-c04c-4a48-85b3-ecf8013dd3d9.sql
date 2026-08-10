-- 1. Safe widget config function (only display fields)
CREATE OR REPLACE FUNCTION public.get_widget_config(_embed_token text)
RETURNS TABLE (
  id uuid,
  name text,
  avatar text,
  primary_color text,
  background_color text,
  text_color text,
  circle_color text,
  launcher_position text,
  welcome_message text,
  welcome_msg_it text,
  welcome_msg_en text,
  calendly_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.avatar, c.primary_color, c.background_color, c.text_color,
         c.circle_color, c.launcher_position, c.welcome_message,
         c.welcome_msg_it, c.welcome_msg_en, c.calendly_url
  FROM public.chatbot_configs c
  WHERE c.embed_token = _embed_token
    AND c.is_active = true
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_widget_config(text) TO anon, authenticated;

-- 2. Drop overly permissive anon read policies
DROP POLICY IF EXISTS "Anon can read chatbot config by embed token" ON public.chatbot_configs;
DROP POLICY IF EXISTS "Anon can read FAQs" ON public.faqs;
DROP POLICY IF EXISTS "Anon can read products via bot config" ON public.products;

-- 3. Drop USING(true) policies (edge functions use the service role, which bypasses RLS)
DROP POLICY IF EXISTS "Edge functions can read chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "Edge functions can read ai_settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Edge functions can read email templates" ON public.email_templates;

-- 4. Drop WITH CHECK(true) insert policies
DROP POLICY IF EXISTS "Edge functions can insert instagram messages" ON public.instagram_messages;
DROP POLICY IF EXISTS "Edge functions can insert rag logs" ON public.rag_query_logs;

-- 5. Ensure service role retains full access
GRANT ALL ON public.chatbot_configs, public.faqs, public.products, public.knowledge_chunks,
  public.ai_settings, public.email_templates, public.instagram_messages, public.rag_query_logs
  TO service_role;

REVOKE INSERT ON public.instagram_messages, public.rag_query_logs FROM anon;
REVOKE SELECT ON public.ai_settings, public.email_templates, public.knowledge_chunks FROM anon;
REVOKE SELECT ON public.chatbot_configs, public.faqs, public.products FROM anon;

-- 6. Remove anon EXECUTE on internal SECURITY DEFINER helpers
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_client_id(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.match_chunks(uuid, text, integer, double precision) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
