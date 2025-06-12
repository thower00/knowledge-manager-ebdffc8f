
-- Update document status to 'completed' for documents that have both chunks and embeddings
UPDATE processed_documents 
SET 
  status = 'completed',
  processed_at = COALESCE(processed_at, now()),
  error = NULL
WHERE id IN (
  SELECT DISTINCT pd.id 
  FROM processed_documents pd
  INNER JOIN document_chunks dc ON pd.id = dc.document_id
  INNER JOIN document_embeddings de ON pd.id = de.document_id
  WHERE pd.status = 'pending'
);
