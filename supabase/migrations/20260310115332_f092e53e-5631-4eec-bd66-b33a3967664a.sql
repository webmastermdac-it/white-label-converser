DROP FUNCTION IF EXISTS public.match_chunks(uuid, text, integer, double precision);

CREATE OR REPLACE FUNCTION public.match_chunks(_chatbot_id uuid, _query_embedding text, _match_count integer DEFAULT 5, _match_threshold double precision DEFAULT 0.5)
 RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision, priority integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _dims integer;
BEGIN
  SELECT embedding_dimensions INTO _dims FROM public.ai_settings LIMIT 1;
  IF _dims IS NULL THEN _dims := 1536; END IF;

  RETURN QUERY EXECUTE format(
    'SELECT
      kc.id,
      kc.content,
      kc.metadata,
      (1 - (kc.embedding::vector(%1$s) <=> $1::vector(%1$s)))::float as similarity,
      kb.priority
    FROM public.knowledge_chunks kc
    JOIN public.knowledge_base kb ON kb.id = kc.knowledge_base_id
    WHERE kc.chatbot_id = $2
      AND kb.status = ''ready''
      AND kc.embedding IS NOT NULL
      AND (1 - (kc.embedding::vector(%1$s) <=> $1::vector(%1$s)))::float > $3
    ORDER BY kc.embedding::vector(%1$s) <=> $1::vector(%1$s)
    LIMIT $4',
    _dims
  ) USING _query_embedding, _chatbot_id, _match_threshold, _match_count;
END;
$function$;