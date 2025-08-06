-- Phase 1: Fix Function Search Path Issues
-- Adding SET search_path = 'public' to prevent search path manipulation attacks

-- 1. Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = $1
    AND role = $2
  );
$function$;

-- 2. Update delete_documents function
CREATE OR REPLACE FUNCTION public.delete_documents(doc_ids uuid[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Simply count rows affected by the DELETE operation
  WITH deleted AS (
    DELETE FROM public.processed_documents
    WHERE id = ANY(doc_ids)
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  
  -- Return true if we deleted at least one document
  RETURN deleted_count > 0;
END;
$function$;

-- 3. Update batch_sync_document_statuses function
CREATE OR REPLACE FUNCTION public.batch_sync_document_statuses()
 RETURNS TABLE(document_id uuid, title text, old_status text, new_status text, chunks_count bigint, embeddings_count bigint, updated boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- 4. Update sync_document_status function
CREATE OR REPLACE FUNCTION public.sync_document_status(doc_id uuid, new_status text, new_processed_at timestamp with time zone DEFAULT NULL::timestamp with time zone, new_error text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  update_count INTEGER;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE 'Updating document % to status %', doc_id, new_status;
  
  -- Update the document status (removed updated_at column reference)
  UPDATE public.processed_documents 
  SET 
    status = new_status,
    processed_at = COALESCE(new_processed_at, CASE WHEN new_status = 'completed' THEN now() ELSE processed_at END),
    error = new_error
  WHERE id = doc_id;
  
  -- Get the number of affected rows
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  -- Log the result
  RAISE NOTICE 'Updated % rows for document %', update_count, doc_id;
  
  -- Return true if at least one row was updated
  RETURN update_count > 0;
END;
$function$;