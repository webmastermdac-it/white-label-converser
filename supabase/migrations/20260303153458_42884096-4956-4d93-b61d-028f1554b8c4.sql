
-- ai_settings table was already created by the partial migration above
-- Now fix the embedding column: convert to text storage for flexible dimensions
-- First drop the HNSW index
DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;

-- Convert embedding column to text to support both 768 and 1536 dimensions
ALTER TABLE public.knowledge_chunks ALTER COLUMN embedding TYPE text USING embedding::text;

-- Update match_chunks to cast dynamically based on ai_settings
CREATE OR REPLACE FUNCTION public.match_chunks(
  _chatbot_id uuid,
  _query_embedding text,
  _match_count integer DEFAULT 5,
  _match_threshold double precision DEFAULT 0.5
)
RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _dims integer;
BEGIN
  SELECT embedding_dimensions INTO _dims FROM public.ai_settings LIMIT 1;
  IF _dims IS NULL THEN _dims := 1536; END IF;

  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    (1 - (kc.embedding::vector(_dims) <=> _query_embedding::vector(_dims)))::float as similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_base kb ON kb.id = kc.knowledge_base_id
  WHERE kc.chatbot_id = _chatbot_id
    AND kb.status = 'ready'
    AND kc.embedding IS NOT NULL
    AND (1 - (kc.embedding::vector(_dims) <=> _query_embedding::vector(_dims)))::float > _match_threshold
  ORDER BY kc.embedding::vector(_dims) <=> _query_embedding::vector(_dims)
  LIMIT _match_count;
END;
$$;
