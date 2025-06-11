
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

    // For document listing queries, return ALL documents immediately
    if (isDocumentSpecific && /\b(list.*documents|what.*documents|documents.*access)\b/i.test(question)) {
      console.log('Processing document listing query...')
      
      if (availableDocuments && availableDocuments.length > 0) {
        // Get sample content from each document to provide context
        const documentSummaries = []
        
        for (const doc of availableDocuments) {
          const { data: sampleChunks, error: sampleError } = await supabase
            .from('document_chunks')
            .select('content')
            .eq('document_id', doc.id)
            .order('chunk_index', { ascending: true })
            .limit(3) // Get first 3 chunks for each document
          
          if (!sampleError && sampleChunks && sampleChunks.length > 0) {
            const sampleContent = sampleChunks.map(chunk => chunk.content).join(' ').substring(0, 500)
            documentSummaries.push({
              title: doc.title,
              content: sampleContent,
              processed_at: doc.processed_at,
              mime_type: doc.mime_type,
              id: doc.id
            })
          } else {
            // Include document even if no chunks found
            documentSummaries.push({
              title: doc.title,
              content: 'Document processed but content not available for preview.',
              processed_at: doc.processed_at,
              mime_type: doc.mime_type,
              id: doc.id
            })
          }
        }
        
        if (documentSummaries.length > 0) {
          contextText = documentSummaries.map(doc => 
            `Document: ${doc.title}\nType: ${doc.mime_type}\nProcessed: ${doc.processed_at}\nContent Preview: ${doc.content}...`
          ).join('\n\n')
          
          relevantDocs = documentSummaries.map(doc => ({
            document_title: doc.title,
            chunk_content: doc.content
          }))
          
          console.log(`Retrieved content for document listing from ${documentSummaries.length} documents`)
          return { contextText, relevantDocs }
        }
      }
      
      // If no documents found or no content available
      contextText = availableDocuments && availableDocuments.length > 0 
        ? `I have access to ${availableDocuments.length} document(s): ${availableDocuments.map(d => `"${d.title}"`).join(', ')}. However, I was unable to retrieve content from these documents.`
        : 'I do not have access to any processed documents at the moment.'
      
      console.log('Using document list as context')
      return { contextText, relevantDocs }
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
    
    // Final fallback - comprehensive document listing
    if (!contextText && availableDocuments && availableDocuments.length > 0) {
      const docList = availableDocuments.map(d => `"${d.title}" (${d.mime_type})`).join(', ')
      contextText = `I have access to the following ${availableDocuments.length} document(s): ${docList}. However, I was unable to retrieve the content from these documents. This could be due to processing issues or empty content. The documents were processed successfully but may need re-processing to generate proper embeddings.`
      console.log('Using comprehensive document list as context')
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
