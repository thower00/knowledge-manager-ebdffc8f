
-- Fix the sync_document_status function to remove the non-existent updated_at column
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
$$;
