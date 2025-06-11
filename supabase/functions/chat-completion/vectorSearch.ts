
import { ChatConfig, ContextSource } from './types.ts'

export async function performVectorSearch(
  supabase: any,
  question: string,
  config: ChatConfig
): Promise<{ contextText: string; relevantDocs: ContextSource[] }> {
  let contextText = ''
  let relevantDocs: ContextSource[] = []
  
  try {
    console.log('Generating embedding for question...')
    
    // Preprocess query to detect document-specific requests
    const isDocumentSpecific = /\b(the document|this document|document|summarize|summary)\b/i.test(question)
    console.log('Query is document-specific:', isDocumentSpecific)
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.embeddingModel,
        input: question,
      }),
    })
    
    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.text()
      console.error('OpenAI embedding error:', embeddingResponse.status, errorData)
      throw new Error(`Embedding generation failed: ${embeddingResponse.status}`)
    }
    
    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding
    console.log('Generated embedding with dimensions:', queryEmbedding.length)
    
    // Debug: Check what documents are available
    const { data: availableDocuments, error: docError } = await supabase
      .from('processed_documents')
      .select('id, title, url, status')
      .eq('status', 'completed')
    
    if (docError) {
      console.error('Error fetching documents:', docError)
    } else {
      console.log('Available documents:', availableDocuments?.map(d => ({ id: d.id, title: d.title })) || [])
    }
    
    // Multi-threshold vector search strategy
    const thresholds = isDocumentSpecific ? [0.5, 0.6, 0.7] : [parseFloat(config.similarityThreshold), 0.5, 0.6]
    let searchResults = null
    
    for (const threshold of thresholds) {
      console.log(`Attempting vector search with threshold: ${threshold}`)
      const { data: results, error: searchError } = await supabase
        .rpc('search_similar_embeddings', {
          query_embedding: queryEmbedding,
          similarity_threshold: threshold,
          match_count: parseInt(config.embeddingBatchSize)
        })
      
      if (searchError) {
        console.error(`Vector search error at threshold ${threshold}:`, searchError)
      } else {
        console.log(`Vector search results at threshold ${threshold}:`, results?.length || 0)
        if (results && results.length > 0) {
          searchResults = results
          console.log('Search results details:', results.map(r => ({
            similarity: r.similarity,
            doc_title: r.document_title,
            content_length: r.chunk_content?.length || 0
          })))
          break
        }
      }
    }
    
    if (searchResults && searchResults.length > 0) {
      relevantDocs = searchResults.map(result => ({
        document_title: result.document_title,
        chunk_content: result.chunk_content,
        similarity: result.similarity
      }))
      
      contextText = searchResults
        .map(result => `Document: ${result.document_title}\nContent: ${result.chunk_content}`)
        .join('\n\n')
      
      console.log('Found relevant content via vector search, total context length:', contextText.length)
    } else {
      // Enhanced fallback: Get document content directly from chunks
      console.log('Vector search unsuccessful, using enhanced fallback...')
      
      if (availableDocuments && availableDocuments.length > 0) {
        console.log('Getting document content directly from chunks...')
        
        // Get chunks with proper joins - prioritize recent or complete documents
        const { data: documentChunks, error: chunksError } = await supabase
          .from('document_chunks')
          .select(`
            id,
            content,
            chunk_index,
            processed_documents!inner(title, url, id, created_at)
          `)
          .in('document_id', availableDocuments.map(d => d.id))
          .order('chunk_index', { ascending: true })
          .limit(20) // Increased limit for better coverage
        
        if (chunksError) {
          console.error('Error fetching document chunks:', chunksError)
        } else {
          console.log('Found document chunks via enhanced fallback:', documentChunks?.length || 0)
          
          if (documentChunks && documentChunks.length > 0) {
            // Group chunks by document and create comprehensive context
            const documentContentMap = new Map()
            
            documentChunks.forEach(chunk => {
              const docTitle = chunk.processed_documents?.title
              if (docTitle && chunk.content) {
                if (!documentContentMap.has(docTitle)) {
                  documentContentMap.set(docTitle, [])
                }
                documentContentMap.get(docTitle).push({
                  content: chunk.content,
                  chunk_index: chunk.chunk_index
                })
              }
            })
            
            // Create context from document chunks
            const contextParts = []
            for (const [title, chunks] of documentContentMap.entries()) {
              // Sort chunks by index and combine more content for document-specific queries
              chunks.sort((a, b) => a.chunk_index - b.chunk_index)
              const maxLength = isDocumentSpecific ? 4000 : 2000
              const combinedContent = chunks.map(c => c.content).join(' ').substring(0, maxLength)
              contextParts.push(`Document: ${title}\nContent: ${combinedContent}`)
              
              relevantDocs.push({
                document_title: title,
                chunk_content: combinedContent
              })
            }
            
            contextText = contextParts.join('\n\n')
            console.log('Using enhanced fallback document chunks as context, total length:', contextText.length)
          }
        }
      }
    }
    
    // Final fallback - just list available documents
    if (!contextText && availableDocuments && availableDocuments.length > 0) {
      const docList = availableDocuments.map(d => d.title).join(', ')
      contextText = `I have access to the following documents: ${docList}. However, I was unable to retrieve the content from these documents. This could be due to processing issues or empty content.`
      console.log('Using document list as context')
    } else if (!contextText) {
      contextText = 'I do not have access to any processed documents at the moment.'
      console.log('No documents or content available')
    }
    
  } catch (searchErr) {
    console.error('Document search error:', searchErr)
    contextText = 'I encountered an issue while trying to access document content. Please try again or contact support if the issue persists.'
  }
  
  return { contextText, relevantDocs }
}
