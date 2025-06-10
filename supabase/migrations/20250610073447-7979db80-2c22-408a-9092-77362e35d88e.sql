
-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table to store vector embeddings
CREATE TABLE public.document_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.processed_documents(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  embedding_vector vector(1536), -- Default to OpenAI ada-002 dimensions, can be adjusted
  embedding_model TEXT NOT NULL,
  embedding_provider TEXT NOT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create an index on the embedding vector for similarity searches
CREATE INDEX ON public.document_embeddings USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Create an index on document_id for faster queries
CREATE INDEX idx_document_embeddings_document_id ON public.document_embeddings(document_id);

-- Create an index on chunk_id for faster queries  
CREATE INDEX idx_document_embeddings_chunk_id ON public.document_embeddings(chunk_id);

-- Create an index on embedding_model for filtering by model
CREATE INDEX idx_document_embeddings_model ON public.document_embeddings(embedding_model);

-- Enable Row Level Security
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (assuming users should only access embeddings for documents they have access to)
-- For now, we'll allow all authenticated users to read embeddings
-- You may want to restrict this further based on your access control requirements
CREATE POLICY "Users can view document embeddings" 
  ON public.document_embeddings 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert document embeddings" 
  ON public.document_embeddings 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update document embeddings" 
  ON public.document_embeddings 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete document embeddings" 
  ON public.document_embeddings 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Create a function to search for similar embeddings
CREATE OR REPLACE FUNCTION public.search_similar_embeddings(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  chunk_id uuid,
  document_title text,
  chunk_content text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    de.id,
    de.document_id,
    de.chunk_id,
    pd.title as document_title,
    dc.content as chunk_content,
    1 - (de.embedding_vector <=> query_embedding) as similarity
  FROM public.document_embeddings de
  JOIN public.processed_documents pd ON de.document_id = pd.id
  JOIN public.document_chunks dc ON de.chunk_id = dc.id
  WHERE 1 - (de.embedding_vector <=> query_embedding) > similarity_threshold
  ORDER BY de.embedding_vector <=> query_embedding
  LIMIT match_count;
$$;
