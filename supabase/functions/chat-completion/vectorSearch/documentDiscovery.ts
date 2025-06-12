
import { DocumentInfo } from './types.ts'

export async function discoverAvailableDocuments(supabase: any): Promise<DocumentInfo[]> {
  console.log('=== Discovering available documents ===')
  
  // Enhanced document discovery - get documents with completed status OR those with actual content/embeddings
  const { data: allDocuments, error: docError } = await supabase
    .from('processed_documents')
    .select('id, title, url, status, processed_at, mime_type')
    .in('status', ['completed', 'pending'])
  
  const availableDocuments: DocumentInfo[] = []
  
  if (!docError && allDocuments) {
    // Check which documents actually have embeddings/chunks available
    for (const doc of allDocuments) {
      const { data: embeddingCount, error: embeddingError } = await supabase
        .from('document_embeddings')
        .select('id', { count: 'exact' })
        .eq('document_id', doc.id)
      
      const { data: chunkCount, error: chunkError } = await supabase
        .from('document_chunks')
        .select('id', { count: 'exact' })
        .eq('document_id', doc.id)
      
      // Document is available if it has both chunks and embeddings
      if (!embeddingError && !chunkError && 
          embeddingCount && embeddingCount.length > 0 && 
          chunkCount && chunkCount.length > 0) {
        availableDocuments.push({
          ...doc,
          chunksCount: chunkCount.length,
          embeddingsCount: embeddingCount.length
        })
        console.log(`Document "${doc.title}" is available with ${chunkCount.length} chunks and ${embeddingCount.length} embeddings`)
      }
    }
  }
  
  if (docError) {
    console.error('Error fetching documents:', docError)
  } else {
    console.log('Available documents with content:', availableDocuments?.map(d => ({ 
      id: d.id, 
      title: d.title, 
      status: d.status,
      chunksCount: d.chunksCount,
      embeddingsCount: d.embeddingsCount
    })) || [])
  }

  return availableDocuments
}
