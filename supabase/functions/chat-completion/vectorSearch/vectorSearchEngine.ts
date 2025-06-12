
import { ContextSource } from '../types.ts'

export async function performSimilaritySearch(
  supabase: any,
  queryEmbedding: number[],
  config: any,
  isDocumentSpecific: boolean,
  isSummaryRequest: boolean = false,
  isExtensiveSummary: boolean = false,
  isFactualQuestion: boolean = false
): Promise<ContextSource[]> {
  // Enhanced thresholds for different types of questions
  let baseThresholds
  
  if (isFactualQuestion) {
    // More relaxed thresholds for factual questions to capture more potential matches
    baseThresholds = isDocumentSpecific ? [0.1, 0.2, 0.3, 0.4, 0.5] : [0.15, 0.25, 0.35, 0.45, 0.55]
  } else if (isSummaryRequest) {
    // Relaxed thresholds for summary requests
    baseThresholds = [0.1, 0.2, 0.3, 0.4, 0.5]
  } else {
    // Standard thresholds for regular questions
    baseThresholds = isDocumentSpecific ? [0.15, 0.25, 0.35, 0.45] : [parseFloat(config.similarityThreshold) * 0.8, 0.25, 0.35, 0.45]
  }
  
  console.log(`Using ${isFactualQuestion ? 'factual-question-optimized' : (isSummaryRequest ? 'summary-optimized' : 'standard')} search thresholds:`, baseThresholds)
  
  let searchResults = null
  
  for (const threshold of baseThresholds) {
    console.log(`Attempting enhanced vector search with threshold: ${threshold}`)
    
    // Enhanced match count for different question types
    let matchCount
    if (isFactualQuestion) {
      matchCount = 25  // More results for factual questions to ensure we capture details
    } else if (isSummaryRequest) {
      matchCount = isExtensiveSummary ? 30 : 25
    } else {
      matchCount = isDocumentSpecific ? 20 : 15
    }
    
    console.log(`Using match count: ${matchCount} for question type`)
    
    const { data: results, error: searchError } = await supabase
      .rpc('search_similar_embeddings', {
        query_embedding: queryEmbedding,
        similarity_threshold: threshold,
        match_count: matchCount
      })
    
    if (searchError) {
      console.error(`Enhanced vector search error at threshold ${threshold}:`, searchError)
    } else {
      console.log(`Enhanced vector search results at threshold ${threshold}:`, results?.length || 0)
      if (results && results.length > 0) {
        console.log('Sample results:', results.slice(0, 3).map(r => ({
          similarity: r.similarity,
          doc_title: r.document_title,
          content_preview: r.chunk_content?.substring(0, 100) + '...'
        })))
        
        // Enhanced result processing based on question type
        if (isFactualQuestion) {
          searchResults = processFactualQuestionResults(results)
        } else if (isSummaryRequest) {
          searchResults = processSummaryResults(results, isExtensiveSummary)
        } else {
          searchResults = processStandardResults(results, isDocumentSpecific)
        }
        
        console.log('Final enhanced search results details:', searchResults.map(r => ({
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

/**
 * Enhanced processing for factual questions - prioritizes relevance and completeness
 */
function processFactualQuestionResults(results: any[]): any[] {
  console.log('Processing results for factual question request...')
  
  // Group results by document to ensure comprehensive coverage
  const resultsByDocument = new Map()
  results.forEach(result => {
    const docTitle = result.document_title
    if (!resultsByDocument.has(docTitle)) {
      resultsByDocument.set(docTitle, [])
    }
    resultsByDocument.get(docTitle).push(result)
  })
  
  console.log(`Factual question results found across ${resultsByDocument.size} different documents:`, 
    Array.from(resultsByDocument.keys()))
  
  // For factual questions, prioritize getting detailed content from the most relevant documents
  const diverseResults = []
  const chunksPerDocument = 6  // More chunks per document for factual questions
  const totalChunksLimit = 20  // Higher total limit for factual questions
  
  // Sort documents by average similarity and take best chunks from each
  const documentsByRelevance = Array.from(resultsByDocument.entries())
    .map(([docTitle, docResults]) => ({
      docTitle,
      docResults: docResults.sort((a, b) => b.similarity - a.similarity),
      avgSimilarity: docResults.reduce((sum, r) => sum + r.similarity, 0) / docResults.length,
      maxSimilarity: Math.max(...docResults.map(r => r.similarity))
    }))
    .sort((a, b) => b.maxSimilarity - a.maxSimilarity)  // Sort by highest similarity rather than average
  
  // Take chunks from the most relevant documents first
  for (const { docTitle, docResults } of documentsByRelevance) {
    if (diverseResults.length >= totalChunksLimit) break
    
    const chunksToTake = Math.min(
      chunksPerDocument, 
      docResults.length,
      totalChunksLimit - diverseResults.length
    )
    
    diverseResults.push(...docResults.slice(0, chunksToTake))
    console.log(`Added ${chunksToTake} chunks from document: ${docTitle} (max similarity: ${docResults[0].similarity})`)
  }
  
  return diverseResults
    .sort((a, b) => b.similarity - a.similarity) // Sort all results by similarity
    .slice(0, totalChunksLimit) // Final limit
}

/**
 * Process results specifically for summary requests
 * Ensures better coverage across documents and prioritizes completeness
 */
function processSummaryResults(results: any[], isExtensiveSummary: boolean): any[] {
  console.log('Processing results for summary request...')
  
  // Group results by document to ensure comprehensive coverage
  const resultsByDocument = new Map()
  results.forEach(result => {
    const docTitle = result.document_title
    if (!resultsByDocument.has(docTitle)) {
      resultsByDocument.set(docTitle, [])
    }
    resultsByDocument.get(docTitle).push(result)
  })
  
  console.log(`Summary results found across ${resultsByDocument.size} different documents:`, 
    Array.from(resultsByDocument.keys()))
  
  // For summary requests, prioritize getting substantial content from each document
  const diverseResults = []
  const chunksPerDocument = isExtensiveSummary ? 8 : 5 // More chunks for extensive summaries
  const totalChunksLimit = isExtensiveSummary ? 20 : 15
  
  // Sort documents by average similarity to prioritize most relevant documents
  const documentsByRelevance = Array.from(resultsByDocument.entries())
    .map(([docTitle, docResults]) => ({
      docTitle,
      docResults: docResults.sort((a, b) => b.similarity - a.similarity),
      avgSimilarity: docResults.reduce((sum, r) => sum + r.similarity, 0) / docResults.length
    }))
    .sort((a, b) => b.avgSimilarity - a.avgSimilarity)
  
  // Take chunks from the most relevant documents first
  for (const { docTitle, docResults } of documentsByRelevance) {
    if (diverseResults.length >= totalChunksLimit) break
    
    const chunksToTake = Math.min(
      chunksPerDocument, 
      docResults.length,
      totalChunksLimit - diverseResults.length
    )
    
    diverseResults.push(...docResults.slice(0, chunksToTake))
    console.log(`Added ${chunksToTake} chunks from document: ${docTitle}`)
  }
  
  return diverseResults
    .sort((a, b) => b.similarity - a.similarity) // Sort all results by similarity
    .slice(0, totalChunksLimit) // Final limit
}

/**
 * Standard result processing for non-summary requests
 */
function processStandardResults(results: any[], isDocumentSpecific: boolean): any[] {
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
  
  return diverseResults
    .sort((a, b) => b.similarity - a.similarity) // Sort all results by similarity
    .slice(0, 15) // Limit total results
}
