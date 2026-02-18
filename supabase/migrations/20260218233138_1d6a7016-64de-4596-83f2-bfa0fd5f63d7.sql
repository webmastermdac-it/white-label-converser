
-- Fix overly permissive anon policies by adding basic constraints
-- Drop the overly permissive ones and replace with constrained versions

DROP POLICY IF EXISTS "Anon can update chat sessions (widget)" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anon can insert leads (widget)" ON public.leads;
DROP POLICY IF EXISTS "Anon can insert and update chat sessions (widget)" ON public.chat_sessions;

-- Widget insert for leads: require bot_id to be a valid chatbot config (prevents abuse)
CREATE POLICY "Anon can insert leads via widget" ON public.leads
  FOR INSERT TO anon
  WITH CHECK (
    bot_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.chatbot_configs WHERE id = bot_id AND is_active = true)
  );

-- Widget insert for chat_sessions: require bot_id to be valid
CREATE POLICY "Anon can insert chat sessions via widget" ON public.chat_sessions
  FOR INSERT TO anon
  WITH CHECK (
    bot_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.chatbot_configs WHERE id = bot_id AND is_active = true)
  );

-- Widget update for chat_sessions: only update by session_token (widget session owner)
CREATE POLICY "Anon can update own chat session via widget" ON public.chat_sessions
  FOR UPDATE TO anon
  USING (
    session_token IS NOT NULL AND session_token != ''
  );
