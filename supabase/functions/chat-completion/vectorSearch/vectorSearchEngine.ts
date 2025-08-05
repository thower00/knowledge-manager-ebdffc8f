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
  // Use search configuration for thresholds
  let baseThresholds
  const searchConfig = config.searchConfig
  
  if (isFactualQuestion) {
    baseThresholds = searchConfig.factualQuestionThresholds
  } else if (isSummaryRequest) {
    baseThresholds = searchConfig.summaryRequestThresholds
  } else {
    baseThresholds = searchConfig.standardThresholds
  }
  
  console.log(`Using ${isFactualQuestion ? 'factual-question-optimized' : (isSummaryRequest ? 'summary-optimized' : 'standard')} search thresholds:`, baseThresholds)
  
  let searchResults = null
  
  for (const threshold of baseThresholds) {
    console.log(`Attempting enhanced vector search with threshold: ${threshold}`)
    
    // Use search configuration for match count
    let matchCount
    if (isFactualQuestion) {
      matchCount = searchConfig.factualQuestionMatchCount
    } else if (isSummaryRequest) {
      matchCount = isExtensiveSummary ? searchConfig.extensiveSummaryMatchCount : searchConfig.summaryMatchCount
    } else {
      matchCount = searchConfig.standardMatchCount
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
          searchResults = processFactualQuestionResults(results, searchConfig)
        } else if (isSummaryRequest) {
          searchResults = processSummaryResults(results, isExtensiveSummary, searchConfig)
        } else {
          searchResults = processStandardResults(results, isDocumentSpecific, searchConfig)
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
 * Enhanced processing for factual questions - prioritizes document coverage and comprehensive time-related content
 */
function processFactualQuestionResults(results: any[], searchConfig: any): any[] {
  console.log('Processing results for factual question request with enhanced comprehensive document coverage...')
  
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
  
  // For factual questions, prioritize getting comprehensive coverage from relevant documents
  const diverseResults = []
  const chunksPerDocument = searchConfig.factualQuestionChunksPerDocument
  const totalChunksLimit = searchConfig.factualQuestionTotalChunksLimit
  
  // Sort documents by relevance and ensure we get chunks from different parts of each document
  const documentsByRelevance = Array.from(resultsByDocument.entries())
    .map(([docTitle, docResults]) => ({
      docTitle,
      docResults: docResults.sort((a, b) => b.similarity - a.similarity),
      avgSimilarity: docResults.reduce((sum, r) => sum + r.similarity, 0) / docResults.length,
      maxSimilarity: Math.max(...docResults.map(r => r.similarity))
    }))
    .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
  
  // Enhanced chunk selection to ensure comprehensive document coverage
  for (const { docTitle, docResults } of documentsByRelevance) {
    if (diverseResults.length >= totalChunksLimit) break
    
    const chunksToTake = Math.min(
      chunksPerDocument, 
      docResults.length,
      totalChunksLimit - diverseResults.length
    )
    
    // For factual questions, try to get chunks from different parts of the document with time priority
    const selectedChunks = selectDistributedChunksForFactual(docResults, chunksToTake)
    
    diverseResults.push(...selectedChunks)
    console.log(`Added ${selectedChunks.length} comprehensively distributed chunks from document: ${docTitle} (max similarity: ${docResults[0].similarity})`)
  }
  
  return diverseResults
    .sort((a, b) => b.similarity - a.similarity) // Sort all results by similarity
    .slice(0, totalChunksLimit) // Final limit
}

/**
 * Helper function to select chunks distributed across a document for comprehensive factual coverage
 * Prioritizes later chunks where completion information might be found
 */
function selectDistributedChunksForFactual(chunks: any[], count: number): any[] {
  if (chunks.length <= count) {
    return chunks
  }
  
  // Sort by chunk_index if available to ensure document order
  const sortedChunks = chunks.sort((a, b) => {
    if (a.chunk_index !== undefined && b.chunk_index !== undefined) {
      return a.chunk_index - b.chunk_index
    }
    return b.similarity - a.similarity // Fallback to similarity
  })
  
  // For factual questions, prioritize later chunks where completion dates might be
  const selected = []
  const totalChunks = sortedChunks.length
  
  // Take more chunks from the end (where project completion info typically resides)
  const endCount = Math.ceil(count * 0.5) // 50% from end for factual questions
  const middleCount = Math.ceil(count * 0.3) // 30% from middle
  const beginCount = count - endCount - middleCount // Rest from beginning
  
  // Beginning chunks (project start)
  for (let i = 0; i < beginCount && i < totalChunks; i++) {
    selected.push(sortedChunks[i])
  }
  
  // Middle chunks (project development)
  const middleStart = Math.floor(totalChunks * 0.3)
  for (let i = 0; i < middleCount && (middleStart + i) < totalChunks; i++) {
    selected.push(sortedChunks[middleStart + i])
  }
  
  // End chunks (project completion - prioritized)
  const endStart = Math.max(0, totalChunks - endCount)
  for (let i = endStart; i < totalChunks && selected.length < count; i++) {
    if (!selected.find(chunk => chunk.chunk_index === sortedChunks[i].chunk_index)) {
      selected.push(sortedChunks[i])
    }
  }
  
  return selected
}

/**
 * Process results specifically for summary requests
 * Ensures better coverage across documents and prioritizes completeness
 */
function processSummaryResults(results: any[], isExtensiveSummary: boolean, searchConfig: any): any[] {
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
  const chunksPerDocument = isExtensiveSummary ? searchConfig.extensiveSummaryChunksPerDocument : searchConfig.summaryChunksPerDocument
  const totalChunksLimit = isExtensiveSummary ? searchConfig.extensiveSummaryTotalChunksLimit : searchConfig.summaryTotalChunksLimit
  
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
function processStandardResults(results: any[], isDocumentSpecific: boolean, searchConfig: any): any[] {
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
  const maxPerDocument = Math.min(searchConfig.standardChunksPerDocument, Math.ceil(searchConfig.standardTotalChunksLimit / Math.max(resultsByDocument.size, 1)))
  
  for (const [docTitle, docResults] of resultsByDocument) {
    // Sort by similarity and take the best chunks from each document
    const sortedResults = docResults.sort((a, b) => b.similarity - a.similarity)
    diverseResults.push(...sortedResults.slice(0, maxPerDocument))
  }
  
  return diverseResults
    .sort((a, b) => b.similarity - a.similarity) // Sort all results by similarity
    .slice(0, searchConfig.standardTotalChunksLimit) // Use configured limit
}
