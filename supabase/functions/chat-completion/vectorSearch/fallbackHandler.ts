import { ContextSource } from '../types.ts'
import { DocumentInfo } from './types.ts'

export async function handleFallbackDocumentRetrieval(
  supabase: any,
  availableDocuments: DocumentInfo[],
  isDocumentSpecific: boolean
): Promise<{ contextText: string; relevantDocs: ContextSource[] }> {
  console.log('Vector search unsuccessful, using enhanced fallback...')
  
  if (availableDocuments && availableDocuments.length > 0) {
    console.log('Getting document content directly from chunks...')
    
    // Limit the number of documents we process in fallback to avoid returning everything
    const maxDocumentsInFallback = isDocumentSpecific ? 2 : 1
    const documentsToProcess = availableDocuments.slice(0, maxDocumentsInFallback)
    
    console.log(`Processing ${documentsToProcess.length} documents in fallback (max: ${maxDocumentsInFallback})`)
    
    const documentContentMap = new Map()
    
    for (const doc of documentsToProcess) {
      const { data: documentChunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('id, content, chunk_index')
        .eq('document_id', doc.id)
        .order('chunk_index', { ascending: true })
        .limit(3) // Reduce chunks per document to get more focused results
      
      if (!chunksError && documentChunks && documentChunks.length > 0) {
        documentContentMap.set(doc.title, {
          chunks: documentChunks,
          doc_info: doc
        })
        console.log(`Fallback found ${documentChunks.length} chunks for document: ${doc.title}`)
      } else {
        console.log(`No chunks found for document: ${doc.title}`)
      }
    }
    
    console.log(`Fallback processed ${documentContentMap.size} documents:`, 
      Array.from(documentContentMap.keys()))
    
    if (documentContentMap.size > 0) {
      const contextParts = []
      const relevantDocs: ContextSource[] = []
      
      for (const [title, docData] of documentContentMap.entries()) {
        if (docData.chunks.length > 0) {
          docData.chunks.sort((a, b) => a.chunk_index - b.chunk_index)
          const maxLength = isDocumentSpecific ? 1500 : 800
          const combinedContent = docData.chunks.map(c => c.content).join(' ').substring(0, maxLength)
          contextParts.push(`Document: ${title}\nContent: ${combinedContent}`)
          
          relevantDocs.push({
            document_title: title,
            chunk_content: combinedContent,
            document_id: docData.doc_info.id,
            document_url: docData.doc_info.url
          })
        }
      }
      
      const contextText = contextParts.join('\n\n')
      console.log(`Using enhanced fallback document chunks as context from ${documentContentMap.size} documents, total length:`, contextText.length)
      
      return { contextText, relevantDocs }
    }
  }
  
  return { contextText: '', relevantDocs: [] }
}

export function generateDocumentListingContext(availableDocuments: DocumentInfo[]): string {
  if (availableDocuments && availableDocuments.length > 0) {
    const docCount = availableDocuments.length
    return `I have access to ${docCount} processed document${docCount > 1 ? 's' : ''} that ${docCount > 1 ? 'have' : 'has'} been successfully uploaded and processed:\n\n${availableDocuments.map((doc, index) => `${index + 1}. ${doc.title} (${doc.chunksCount} chunks)`).join('\n')}\n\nI can help you with:\n• Answering questions about the content in these documents\n• Providing summaries of the documents\n• Finding specific information across all documents\n• Explaining key concepts or topics covered\n\nSimply ask me questions about any topics you're interested in, and I'll search through the document content to provide relevant, detailed answers based on what's available.`
  } else {
    return 'I currently do not have access to any processed documents. No documents have been successfully uploaded and processed yet. Please upload and process documents first, then I\'ll be able to help answer questions about their content.'
  }
}

export function generateFinalFallbackContext(availableDocuments: DocumentInfo[]): string {
  if (availableDocuments && availableDocuments.length > 0) {
    return `I have access to ${availableDocuments.length} processed document${availableDocuments.length > 1 ? 's' : ''}, but I was unable to retrieve the content at the moment. This could be due to processing issues or empty content. The documents were processed successfully but may need re-processing to generate proper embeddings.`
  } else {
    return 'I do not have access to any processed documents at the moment.'
  }
}
