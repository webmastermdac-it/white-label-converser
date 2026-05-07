CREATE POLICY "Clients can insert their own chatbots"
ON public.chatbot_configs
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = get_user_client_id(auth.uid())
  AND is_platform_bot = false
);