
-- Create the 'documents' storage bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true);
  END IF;
END;
$$;

-- Allow public read access to objects in the 'documents' bucket
CREATE POLICY "Documents bucket - public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to upload (insert) into the 'documents' bucket
CREATE POLICY "Documents bucket - authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow owners to update their own objects in the 'documents' bucket
CREATE POLICY "Documents bucket - owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid())
WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());

-- Allow owners to delete their own objects in the 'documents' bucket
CREATE POLICY "Documents bucket - owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());
