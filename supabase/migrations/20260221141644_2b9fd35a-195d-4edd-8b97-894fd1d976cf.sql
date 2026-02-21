
ALTER TABLE public.chatbot_configs
  ADD COLUMN IF NOT EXISTS knowledge_base_sections jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_base_documents jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_base_scraped text DEFAULT '';

-- Storage bucket for knowledge base documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kb-documents', 'kb-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: clients can manage their own docs
CREATE POLICY "Clients can upload kb docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kb-documents'
  AND (storage.foldername(name))[1] = (get_user_client_id(auth.uid()))::text
);

CREATE POLICY "Clients can read kb docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kb-documents'
  AND (storage.foldername(name))[1] = (get_user_client_id(auth.uid()))::text
);

CREATE POLICY "Clients can delete kb docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kb-documents'
  AND (storage.foldername(name))[1] = (get_user_client_id(auth.uid()))::text
);

CREATE POLICY "Super admins can manage all kb docs"
ON storage.objects FOR ALL
USING (
  bucket_id = 'kb-documents'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);
