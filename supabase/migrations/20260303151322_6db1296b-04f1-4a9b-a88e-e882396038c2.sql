
-- Match function for similarity search (using extensions schema for vector ops)
CREATE OR REPLACE FUNCTION public.match_chunks(
  _chatbot_id uuid,
  _query_embedding text,
  _match_count integer DEFAULT 5,
  _match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _emb vector(1536);
BEGIN
  _emb := _query_embedding::vector(1536);
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    (1 - (kc.embedding <=> _emb))::float as similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_base kb ON kb.id = kc.knowledge_base_id
  WHERE kc.chatbot_id = _chatbot_id
    AND kb.status = 'ready'
    AND (1 - (kc.embedding <=> _emb))::float > _match_threshold
  ORDER BY kc.embedding <=> _emb
  LIMIT _match_count;
END;
$$;
