
-- Create a secure function to update document statuses
CREATE OR REPLACE FUNCTION public.sync_document_status(
  doc_id UUID,
  new_status TEXT,
  new_processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  new_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_count INTEGER;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE 'Updating document % to status %', doc_id, new_status;
  
  -- Update the document status
  UPDATE public.processed_documents 
  SET 
    status = new_status,
    processed_at = COALESCE(new_processed_at, CASE WHEN new_status = 'completed' THEN now() ELSE processed_at END),
    error = new_error,
    updated_at = now()
  WHERE id = doc_id;
  
  -- Get the number of affected rows
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  -- Log the result
  RAISE NOTICE 'Updated % rows for document %', update_count, doc_id;
  
  -- Return true if at least one row was updated
  RETURN update_count > 0;
END;
$$;

-- Create a function to batch sync multiple documents
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
    SELECT id, title, status 
    FROM public.processed_documents 
    ORDER BY created_at DESC
  LOOP
    -- Count chunks for this document
    SELECT COUNT(*) INTO chunks_count
    FROM public.document_chunks
    WHERE document_id = doc_record.id;
    
    -- Count embeddings for this document
    SELECT COUNT(*) INTO embeddings_count
    FROM public.document_embeddings
    WHERE document_id = doc_record.id;
    
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
    
    -- Return the result
    RETURN QUERY SELECT 
      doc_record.id,
      doc_record.title,
      doc_record.status,
      correct_status,
      chunks_count,
      embeddings_count,
      was_updated;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_document_status(UUID, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_sync_document_statuses() TO authenticated;
