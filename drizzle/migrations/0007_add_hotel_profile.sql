ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS hotel_profile jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.chatbot_configs.hotel_profile IS 'Hotel module profile: property, rooms, services, policies, local_guide, booking, reviews';

CREATE POLICY "Clients can upload hotel images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = 'hotel' AND (storage.foldername(name))[2] = (public.get_user_client_id(auth.uid()))::text);
CREATE POLICY "Clients can delete hotel images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = 'hotel' AND (storage.foldername(name))[2] = (public.get_user_client_id(auth.uid()))::text);