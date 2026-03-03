
-- Knowledge base sources
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id uuid NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'txt',
  source_url text,
  file_path text,
  status text NOT NULL DEFAULT 'processing',
  chunk_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Knowledge chunks with embeddings
CREATE TABLE public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
  chatbot_id uuid NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding extensions.vector(1536),
  metadata jsonb DEFAULT '{}',
  chunk_index integer NOT NULL DEFAULT 0,
  token_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RAG query logs
CREATE TABLE public.rag_query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id uuid NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  conversation_id uuid,
  query text NOT NULL,
  chunks_retrieved jsonb DEFAULT '[]',
  response_generated text,
  relevance_score float,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX knowledge_base_chatbot_id_idx ON public.knowledge_base(chatbot_id);
CREATE INDEX knowledge_chunks_chatbot_id_idx ON public.knowledge_chunks(chatbot_id);
CREATE INDEX knowledge_chunks_kb_id_idx ON public.knowledge_chunks(knowledge_base_id);
CREATE INDEX rag_query_logs_chatbot_id_idx ON public.rag_query_logs(chatbot_id);

-- HNSW index for fast similarity search
CREATE INDEX knowledge_chunks_embedding_idx ON public.knowledge_chunks USING hnsw (embedding extensions.vector_cosine_ops);

-- RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all knowledge bases" ON public.knowledge_base FOR ALL USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Clients can manage their own knowledge bases" ON public.knowledge_base FOR ALL USING (
  chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE client_id = get_user_client_id(auth.uid()))
);

CREATE POLICY "Super admins can manage all chunks" ON public.knowledge_chunks FOR ALL USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Clients can read their own chunks" ON public.knowledge_chunks FOR SELECT USING (
  chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE client_id = get_user_client_id(auth.uid()))
);
CREATE POLICY "Edge functions can read chunks" ON public.knowledge_chunks FOR SELECT USING (true);

CREATE POLICY "Super admins can manage all rag logs" ON public.rag_query_logs FOR ALL USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Clients can read their own rag logs" ON public.rag_query_logs FOR SELECT USING (
  chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE client_id = get_user_client_id(auth.uid()))
);
CREATE POLICY "Edge functions can insert rag logs" ON public.rag_query_logs FOR INSERT WITH CHECK (true);
