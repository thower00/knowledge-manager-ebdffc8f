
import { ContextSource } from '../types.ts'

export async function performSimilaritySearch(
  supabase: any,
  queryEmbedding: number[],
  config: any,
  isDocumentSpecific: boolean
): Promise<ContextSource[]> {
  // More relaxed thresholds for better recall, especially for non-English content
  const thresholds = isDocumentSpecific ? [0.15, 0.25, 0.35, 0.45] : [parseFloat(config.similarityThreshold) * 0.8, 0.25, 0.35, 0.45]
  let searchResults = null
  
  for (const threshold of thresholds) {
    console.log(`Attempting vector search with threshold: ${threshold}`)
    const { data: results, error: searchError } = await supabase
      .rpc('search_similar_embeddings', {
        query_embedding: queryEmbedding,
        similarity_threshold: threshold,
        match_count: isDocumentSpecific ? 20 : 15 // More results to ensure we don't miss relevant content
      })
    
    if (searchError) {
      console.error(`Vector search error at threshold ${threshold}:`, searchError)
    } else {
      console.log(`Vector search results at threshold ${threshold}:`, results?.length || 0)
      if (results && results.length > 0) {
        console.log('Sample results:', results.slice(0, 3).map(r => ({
          similarity: r.similarity,
          doc_title: r.document_title,
          content_preview: r.chunk_content?.substring(0, 100) + '...'
        })))
        
        // Group results by document to ensure diversity
        const resultsByDocument = new Map()
        results.forEach(result => {
          const docTitle = result.document_title
          if (!resultsByDocument.has(docTitle)) {
            resultsByDocument.set(docTitle, [])
          }
          resultsByDocument.get(docTitle).push(result)
        })
        
        console.log(`Results found across ${resultsByDocument.size} different documents:`, 
          Array.from(resultsByDocument.keys()))
        
        // Take results from multiple documents to ensure diversity but limit total
        const diverseResults = []
        const maxPerDocument = Math.min(4, Math.ceil(12 / Math.max(resultsByDocument.size, 1)))
        
        for (const [docTitle, docResults] of resultsByDocument) {
          // Sort by similarity and take the best chunks from each document
          const sortedResults = docResults.sort((a, b) => b.similarity - a.similarity)
          diverseResults.push(...sortedResults.slice(0, maxPerDocument))
        }
        
        searchResults = diverseResults
          .sort((a, b) => b.similarity - a.similarity) // Sort all results by similarity
          .slice(0, 15) // Limit total results
        
        console.log('Final search results details:', searchResults.map(r => ({
          similarity: r.similarity,
          doc_title: r.document_title,
          content_length: r.chunk_content?.length || 0
        })))
        break
      }
    }
  }
  
  if (searchResults && searchResults.length > 0) {
    // Get document URLs for search results by fetching from processed_documents
    const documentIds = [...new Set(searchResults.map(r => r.document_id).filter(Boolean))]
    let documentUrlMap = new Map()
    
    if (documentIds.length > 0) {
      const { data: documentsWithUrls, error: urlError } = await supabase
        .from('processed_documents')
        .select('id, url')
        .in('id', documentIds)
      
      if (!urlError && documentsWithUrls) {
        documentsWithUrls.forEach(doc => {
          documentUrlMap.set(doc.id, doc.url)
        })
      }
    }
    
    return searchResults.map(result => ({
      document_title: result.document_title,
      chunk_content: result.chunk_content,
      similarity: result.similarity,
      document_id: result.document_id,
      document_url: result.document_url || documentUrlMap.get(result.document_id)
    }))
  }
  
  return []
}
