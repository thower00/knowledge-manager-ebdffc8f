
-- Fix the ambiguous column reference in batch_sync_document_statuses function
CREATE OR REPLACE FUNCTION public.batch_sync_document_statuses()
RETURNS TABLE(
  document_id UUID,
  title TEXT,
  old_status TEXT,
  new_status TEXT,
  chunks_count BIGINT,
  embeddings_count BIGINT,
  updated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_record RECORD;
  chunks_count BIGINT;
  embeddings_count BIGINT;
  correct_status TEXT;
  was_updated BOOLEAN;
BEGIN
  -- Loop through all documents
  FOR doc_record IN 
    SELECT pd.id, pd.title, pd.status 
    FROM public.processed_documents pd
    ORDER BY pd.created_at DESC
  LOOP
    -- Count chunks for this document
    SELECT COUNT(*) INTO chunks_count
    FROM public.document_chunks dc
    WHERE dc.document_id = doc_record.id;
    
    -- Count embeddings for this document
    SELECT COUNT(*) INTO embeddings_count
    FROM public.document_embeddings de
    WHERE de.document_id = doc_record.id;
    
    -- Determine correct status
    IF chunks_count > 0 AND embeddings_count > 0 THEN
      correct_status := 'completed';
    ELSE
      correct_status := 'pending';
    END IF;
    
    -- Update if status is incorrect
    was_updated := FALSE;
    IF doc_record.status != correct_status THEN
      SELECT public.sync_document_status(
        doc_record.id, 
        correct_status,
        CASE WHEN correct_status = 'completed' THEN now() ELSE NULL END,
        CASE WHEN correct_status = 'pending' THEN NULL ELSE NULL END
      ) INTO was_updated;
    END IF;
    
    -- Return the result with explicit column references
    RETURN QUERY SELECT 
      doc_record.id AS document_id,
      doc_record.title AS title,
      doc_record.status AS old_status,
      correct_status AS new_status,
      chunks_count AS chunks_count,
      embeddings_count AS embeddings_count,
      was_updated AS updated;
  END LOOP;
  
  RETURN;
END;
$$;
