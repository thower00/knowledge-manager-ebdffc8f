
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
    const isDocumentSpecific = /\b(the document|this document|document|summarize|summary|list.*documents|what.*documents|documents.*access)\b/i.test(question)
    console.log('Query is document-specific:', isDocumentSpecific)
    
    // Enhanced document discovery - get ALL available documents with their processing details
    const { data: availableDocuments, error: docError } = await supabase
      .from('processed_documents')
      .select('id, title, url, status, processed_at, mime_type')
      .eq('status', 'completed')
    
    if (docError) {
      console.error('Error fetching documents:', docError)
    } else {
      console.log('Available completed documents:', availableDocuments?.map(d => ({ 
        id: d.id, 
        title: d.title, 
        processed_at: d.processed_at,
        mime_type: d.mime_type
      })) || [])
    }

    // For document listing queries, return specific count and clear capabilities
    if (isDocumentSpecific && /\b(list.*documents|what.*documents|documents.*access)\b/i.test(question)) {
      console.log('Processing document listing query...')
      
      if (availableDocuments && availableDocuments.length > 0) {
        const docCount = availableDocuments.length
        contextText = `I have access to ${docCount} processed document${docCount > 1 ? 's' : ''} that ${docCount > 1 ? 'have' : 'has'} been successfully uploaded and processed. I can help you with:\n\n• Answering questions about the content in these documents\n• Providing summaries of the documents\n• Finding specific information across all documents\n• Explaining key concepts or topics covered\n\nSimply ask me questions about any topics you're interested in, and I'll search through the document content to provide relevant, detailed answers based on what's available.`
        console.log('Using detailed document access info as context')
        return { contextText, relevantDocs }
      } else {
        contextText = 'I currently do not have access to any processed documents. No documents have been successfully uploaded and processed yet. Please upload and process documents first, then I\'ll be able to help answer questions about their content.'
        console.log('No documents available')
        return { contextText, relevantDocs }
      }
    }
    
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

    // Check document chunks availability for each document
    if (availableDocuments && availableDocuments.length > 0) {
      for (const doc of availableDocuments) {
        const { data: chunkCount, error: chunkError } = await supabase
          .from('document_chunks')
          .select('id', { count: 'exact' })
          .eq('document_id', doc.id)
        
        if (!chunkError) {
          console.log(`Document "${doc.title}" has ${chunkCount?.length || 0} chunks`)
        }

        // Check embeddings for each document
        const { data: embeddingCount, error: embeddingError } = await supabase
          .from('document_embeddings')
          .select('id', { count: 'exact' })
          .eq('document_id', doc.id)
        
        if (!embeddingError) {
          console.log(`Document "${doc.title}" has ${embeddingCount?.length || 0} embeddings`)
        }
      }
    }
    
    // Multi-threshold vector search strategy with improved thresholds
    const thresholds = isDocumentSpecific ? [0.3, 0.4, 0.5, 0.6] : [parseFloat(config.similarityThreshold), 0.4, 0.5, 0.6]
    let searchResults = null
    
    for (const threshold of thresholds) {
      console.log(`Attempting vector search with threshold: ${threshold}`)
      const { data: results, error: searchError } = await supabase
        .rpc('search_similar_embeddings', {
          query_embedding: queryEmbedding,
          similarity_threshold: threshold,
          match_count: parseInt(config.embeddingBatchSize) * 3 // Increase match count for better diversity
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
          
          // For document-specific queries, ensure we get results from ALL available documents
          if (isDocumentSpecific && availableDocuments) {
            // Check if we're missing any documents from vector search results
            const foundDocuments = Array.from(resultsByDocument.keys())
            const missingDocuments = availableDocuments.filter(doc => 
              !foundDocuments.some(foundDoc => foundDoc.includes(doc.title))
            )
            
            if (missingDocuments.length > 0) {
              console.log(`Missing documents from vector search: ${missingDocuments.map(d => d.title)}`)
              
              // Add content from missing documents directly
              for (const doc of missingDocuments) {
                const { data: docChunks, error: chunkError } = await supabase
                  .from('document_chunks')
                  .select('content')
                  .eq('document_id', doc.id)
                  .order('chunk_index', { ascending: true })
                  .limit(2)
                
                if (!chunkError && docChunks && docChunks.length > 0) {
                  const combinedContent = docChunks.map(c => c.content).join(' ').substring(0, 1000)
                  resultsByDocument.set(doc.title, [{
                    document_title: doc.title,
                    chunk_content: combinedContent,
                    similarity: 0.5 // Default similarity for direct retrieval
                  }])
                  console.log(`Added missing document "${doc.title}" directly`)
                }
              }
            }
          }
          
          // Take results from multiple documents to ensure diversity
          const diverseResults = []
          const maxPerDocument = Math.ceil(parseInt(config.embeddingBatchSize) / Math.max(resultsByDocument.size, 1))
          
          for (const [docTitle, docResults] of resultsByDocument) {
            diverseResults.push(...docResults.slice(0, maxPerDocument))
          }
          
          searchResults = diverseResults.slice(0, parseInt(config.embeddingBatchSize) * 2)
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
      relevantDocs = searchResults.map(result => ({
        document_title: result.document_title,
        chunk_content: result.chunk_content,
        similarity: result.similarity
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
                chunk_content: combinedContent
              })
            } else {
              // Include document even without chunks
              contextParts.push(`Document: ${title}\nContent: Document processed but content not accessible.`)
              
              relevantDocs.push({
                document_title: title,
                chunk_content: 'Document processed but content not accessible.'
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
    console.error('Document search error:', searchErr)
    contextText = 'I encountered an issue while trying to access document content. Please try again or contact support if the issue persists.'
  }
  
  return { contextText, relevantDocs }
}
