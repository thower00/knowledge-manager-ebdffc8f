
import { ChatConfig } from './config.ts'

export interface ContextSource {
  document_title: string;
  chunk_content: string;
  similarity?: number;
  document_id?: string;
  document_url?: string;
}

export async function performVectorSearch(
  supabase: any,
  question: string,
  config: ChatConfig
): Promise<{ contextText: string; relevantDocs: ContextSource[]; searchDuration?: number }> {
  const startTime = Date.now()
  let contextText = ''
  let relevantDocs: ContextSource[] = []
  
  try {
    console.log('=== Starting vector search ===')
    console.log('Generating embedding for question...')
    
    // Preprocess query to detect document-specific requests
    const isDocumentSpecific = /\b(the document|this document|document|summarize|summary|list.*documents|what.*documents|documents.*access)\b/i.test(question)
    console.log('Query is document-specific:', isDocumentSpecific)
    
    // Enhanced document discovery - get documents with completed status OR those with actual content/embeddings
    const { data: allDocuments, error: docError } = await supabase
      .from('processed_documents')
      .select('id, title, url, status, processed_at, mime_type')
      .in('status', ['completed', 'pending'])
    
    let availableDocuments = []
    
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

    // For document listing queries, return specific count and clear capabilities
    if (isDocumentSpecific && /\b(list.*documents|what.*documents|documents.*access)\b/i.test(question)) {
      console.log('Processing document listing query...')
      
      if (availableDocuments && availableDocuments.length > 0) {
        const docCount = availableDocuments.length
        contextText = `I have access to ${docCount} processed document${docCount > 1 ? 's' : ''} that ${docCount > 1 ? 'have' : 'has'} been successfully uploaded and processed:\n\n${availableDocuments.map((doc, index) => `${index + 1}. ${doc.title} (${doc.chunksCount} chunks)`).join('\n')}\n\nI can help you with:\n• Answering questions about the content in these documents\n• Providing summaries of the documents\n• Finding specific information across all documents\n• Explaining key concepts or topics covered\n\nSimply ask me questions about any topics you're interested in, and I'll search through the document content to provide relevant, detailed answers based on what's available.`
        console.log('Using detailed document access info with document list as context')
        return { contextText, relevantDocs, searchDuration: Date.now() - startTime }
      } else {
        contextText = 'I currently do not have access to any processed documents. No documents have been successfully uploaded and processed yet. Please upload and process documents first, then I\'ll be able to help answer questions about their content.'
        console.log('No documents available')
        return { contextText, relevantDocs, searchDuration: Date.now() - startTime }
      }
    }
    
    console.log('=== Attempting OpenAI embedding generation ===')
    console.log('API Key available:', !!config.apiKey)
    console.log('Embedding model:', config.embeddingModel)
    console.log('Question length:', question.length)
    
    let embeddingResponse;
    try {
      embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
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
      
      console.log('OpenAI embedding response status:', embeddingResponse.status)
      console.log('OpenAI embedding response ok:', embeddingResponse.ok)
      
    } catch (fetchError) {
      console.error('=== Fetch error when calling OpenAI embeddings ===')
      console.error('Fetch error details:', {
        message: fetchError.message,
        stack: fetchError.stack,
        name: fetchError.name
      })
      throw new Error(`Network error calling OpenAI embeddings: ${fetchError.message}`)
    }
    
    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.text()
      console.error('=== OpenAI embedding API error ===')
      console.error('Status:', embeddingResponse.status)
      console.error('Status text:', embeddingResponse.statusText)
      console.error('Error response:', errorData)
      throw new Error(`Embedding generation failed: ${embeddingResponse.status} - ${errorData}`)
    }
    
    let embeddingData;
    try {
      embeddingData = await embeddingResponse.json()
      console.log('Successfully parsed embedding response')
    } catch (parseError) {
      console.error('=== Error parsing embedding response ===')
      console.error('Parse error:', parseError.message)
      throw new Error(`Failed to parse embedding response: ${parseError.message}`)
    }
    
    if (!embeddingData.data || !embeddingData.data[0] || !embeddingData.data[0].embedding) {
      console.error('=== Invalid embedding data structure ===')
      console.error('Embedding data:', embeddingData)
      throw new Error('Invalid embedding data received from OpenAI')
    }
    
    const queryEmbedding = embeddingData.data[0].embedding
    console.log('Generated embedding with dimensions:', queryEmbedding.length)

    // Multi-threshold vector search strategy with improved thresholds
    const thresholds = isDocumentSpecific ? [0.3, 0.4, 0.5, 0.6] : [parseFloat(config.similarityThreshold), 0.4, 0.5, 0.6]
    let searchResults = null
    
    for (const threshold of thresholds) {
      console.log(`Attempting vector search with threshold: ${threshold}`)
      const { data: results, error: searchError } = await supabase
        .rpc('search_similar_embeddings', {
          query_embedding: queryEmbedding,
          similarity_threshold: threshold,
          match_count: 20 // Increase match count for better diversity
        })
      
      if (searchError) {
        console.error(`Vector search error at threshold ${threshold}:`, searchError)
      } else {
        console.log(`Vector search results at threshold ${threshold}:`, results?.length || 0)
        if (results && results.length > 0) {
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
          
          // Take results from multiple documents to ensure diversity
          const diverseResults = []
          const maxPerDocument = Math.ceil(10 / Math.max(resultsByDocument.size, 1))
          
          for (const [docTitle, docResults] of resultsByDocument) {
            diverseResults.push(...docResults.slice(0, maxPerDocument))
          }
          
          searchResults = diverseResults.slice(0, 20)
          console.log('Search results details:', searchResults.map(r => ({
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
      
      relevantDocs = searchResults.map(result => ({
        document_title: result.document_title,
        chunk_content: result.chunk_content,
        similarity: result.similarity,
        document_id: result.document_id,
        document_url: result.document_url || documentUrlMap.get(result.document_id)
      }))
      
      contextText = searchResults
        .map(result => `Document: ${result.document_title}\nContent: ${result.chunk_content}`)
        .join('\n\n')
      
      console.log('Found relevant content via vector search, total context length:', contextText.length)
      
      // Log unique documents found
      const uniqueDocs = [...new Set(searchResults.map(r => r.document_title))]
      console.log(`Vector search retrieved content from ${uniqueDocs.length} unique documents:`, uniqueDocs)
      
    } else {
      // Enhanced fallback: Get content from ALL available documents
      console.log('Vector search unsuccessful, using enhanced fallback for all documents...')
      
      if (availableDocuments && availableDocuments.length > 0) {
        console.log('Getting document content directly from chunks for all available documents...')
        
        // Get chunks from ALL documents - process each document individually
        const documentContentMap = new Map()
        
        for (const doc of availableDocuments) {
          const { data: documentChunks, error: chunksError } = await supabase
            .from('document_chunks')
            .select('id, content, chunk_index')
            .eq('document_id', doc.id)
            .order('chunk_index', { ascending: true })
            .limit(5) // Get more chunks per document for better coverage
          
          if (!chunksError && documentChunks && documentChunks.length > 0) {
            documentContentMap.set(doc.title, {
              chunks: documentChunks,
              doc_info: doc
            })
            console.log(`Fallback found ${documentChunks.length} chunks for document: ${doc.title}`)
          } else {
            console.log(`No chunks found for document: ${doc.title}`)
            // Still include the document in the map even if no chunks
            documentContentMap.set(doc.title, {
              chunks: [],
              doc_info: doc
            })
          }
        }
        
        console.log(`Fallback processed ${documentContentMap.size} documents:`, 
          Array.from(documentContentMap.keys()))
        
        if (documentContentMap.size > 0) {
          // Create context from document chunks - ensure all documents are represented
          const contextParts = []
          for (const [title, docData] of documentContentMap.entries()) {
            if (docData.chunks.length > 0) {
              // Sort chunks by index and combine content
              docData.chunks.sort((a, b) => a.chunk_index - b.chunk_index)
              const maxLength = isDocumentSpecific ? 2000 : 1000
              const combinedContent = docData.chunks.map(c => c.content).join(' ').substring(0, maxLength)
              contextParts.push(`Document: ${title}\nContent: ${combinedContent}`)
              
              relevantDocs.push({
                document_title: title,
                chunk_content: combinedContent,
                document_id: docData.doc_info.id,
                document_url: docData.doc_info.url
              })
            } else {
              // Include document even without chunks
              contextParts.push(`Document: ${title}\nContent: Document processed but content not accessible.`)
              
              relevantDocs.push({
                document_title: title,
                chunk_content: 'Document processed but content not accessible.',
                document_id: docData.doc_info.id,
                document_url: docData.doc_info.url
              })
            }
          }
          
          contextText = contextParts.join('\n\n')
          console.log(`Using enhanced fallback document chunks as context from ${documentContentMap.size} documents, total length:`, contextText.length)
        }
      }
    }
    
    // Final fallback - provide information about document availability
    if (!contextText) {
      if (availableDocuments && availableDocuments.length > 0) {
        contextText = `I have access to ${availableDocuments.length} processed document${availableDocuments.length > 1 ? 's' : ''}, but I was unable to retrieve the content at the moment. This could be due to processing issues or empty content. The documents were processed successfully but may need re-processing to generate proper embeddings.`
        console.log('Using document availability info as context')
      } else {
        contextText = 'I do not have access to any processed documents at the moment.'
        console.log('No documents or content available')
      }
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
