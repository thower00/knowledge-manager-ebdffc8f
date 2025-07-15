-- Enable RLS on document_chunks table (CRITICAL SECURITY FIX)
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Add proper RLS policies for document_chunks
CREATE POLICY "Users can view document chunks" 
ON public.document_chunks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create document chunks" 
ON public.document_chunks 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update document chunks" 
ON public.document_chunks 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete document chunks" 
ON public.document_chunks 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Verify and fix has_role function to prevent recursion
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = $1
    AND role = $2
  );
$function$;

-- Add missing RLS policies for processed_documents (standardize access)
CREATE POLICY "Users can create processed documents" 
ON public.processed_documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update processed documents" 
ON public.processed_documents 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete processed documents" 
ON public.processed_documents 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Add missing RLS policies for profiles table
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);