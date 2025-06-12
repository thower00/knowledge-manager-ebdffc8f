
import { ChatConfig } from './config.ts'
import { ContextSource } from './types.ts'
import { VectorSearchResult, DocumentInfo } from './vectorSearch/types.ts'
import { discoverAvailableDocuments } from './vectorSearch/documentDiscovery.ts'
import { generateQueryEmbedding } from './vectorSearch/embeddingGenerator.ts'
import { performSimilaritySearch } from './vectorSearch/vectorSearchEngine.ts'
import { 
  handleFallbackDocumentRetrieval, 
  generateDocumentListingContext, 
  generateFinalFallbackContext 
} from './vectorSearch/fallbackHandler.ts'

export async function performVectorSearch(
  supabase: any,
  question: string,
  config: ChatConfig
): Promise<VectorSearchResult> {
  const startTime = Date.now()
  let contextText = ''
  let relevantDocs: ContextSource[] = []
  
  try {
    console.log('=== Starting vector search ===')
    console.log('Generating embedding for question...')
    
    // Enhanced query preprocessing to detect document-specific requests
    const isDocumentSpecific = /\b(the document|this document|document|summarize|summary|list.*documents|what.*documents|documents.*access|specific.*document|particular.*document)\b/i.test(question)
    console.log('Query is document-specific:', isDocumentSpecific)
    
    // Discover available documents
    const availableDocuments = await discoverAvailableDocuments(supabase)

    // For document listing queries, return specific count and clear capabilities
    if (/\b(list.*documents|what.*documents|documents.*access|how many.*documents)\b/i.test(question)) {
      console.log('Processing document listing query...')
      contextText = generateDocumentListingContext(availableDocuments)
      console.log('Using detailed document access info with document list as context')
      return { contextText, relevantDocs, searchDuration: Date.now() - startTime }
    }
    
    // Generate embedding for the user's question
    const queryEmbedding = await generateQueryEmbedding(question, config)

    // Perform similarity search with improved filtering
    const searchResults = await performSimilaritySearch(supabase, queryEmbedding, config, isDocumentSpecific)
    
    if (searchResults.length > 0) {
      relevantDocs = searchResults
      contextText = searchResults
        .map(result => `Document: ${result.document_title}\nContent: ${result.chunk_content}`)
        .join('\n\n')
      
      console.log('Found relevant content via vector search, total context length:', contextText.length)
      
      // Log unique documents found
      const uniqueDocs = [...new Set(searchResults.map(r => r.document_title))]
      console.log(`Vector search retrieved content from ${uniqueDocs.length} unique documents:`, uniqueDocs)
      
    } else {
      // More selective fallback
      console.log('Vector search returned no results, using selective fallback...')
      const fallbackResult = await handleFallbackDocumentRetrieval(supabase, availableDocuments, isDocumentSpecific)
      contextText = fallbackResult.contextText
      relevantDocs = fallbackResult.relevantDocs
      
      if (relevantDocs.length > 0) {
        const uniqueDocs = [...new Set(relevantDocs.map(r => r.document_title))]
        console.log(`Fallback retrieved content from ${uniqueDocs.length} documents:`, uniqueDocs)
      }
    }
    
    // Final fallback - provide information about document availability
    if (!contextText) {
      contextText = generateFinalFallbackContext(availableDocuments)
      console.log('Using document availability info as context')
    }
    
  } catch (searchErr) {
    console.error('=== Document search error ===')
    console.error('Search error details:', {
      message: searchErr.message,
      stack: searchErr.stack,
      name: searchErr.name
    })
    contextText = 'I encountered an issue while trying to access document content. Please try again or contact support if the issue persists.'
    
    // Re-throw the error so the calling function can handle it
    throw searchErr
  }
  
  return { 
    contextText, 
    relevantDocs, 
    searchDuration: Date.now() - startTime 
  }
}
