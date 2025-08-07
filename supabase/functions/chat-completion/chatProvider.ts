import { ChatMessage, ChatConfig, ContextSource } from './types.ts'

// Document reference utilities (moved here to avoid import issues in edge functions)
interface DocumentReference {
  title: string;
  viewUrl: string;
  downloadUrl?: string;
  isGoogleDrive: boolean;
}

interface EnhancedContextSource {
  document_title: string;
  chunk_content: string;
  similarity?: number;
  document_url?: string;
  document_id?: string;
  chunk_id?: string;
}

/**
 * Extracts Google Drive file ID from various URL formats
 */
function extractGoogleDriveFileId(url: string): string | null {
  if (!url.includes('drive.google.com')) {
    return null;
  }
  
  // Format: drive.google.com/file/d/FILE_ID/view
  const filePattern = /\/file\/d\/([^/]+)/;
  const fileMatch = url.match(filePattern);
  
  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }
  
  // Format: drive.google.com/open?id=FILE_ID
  const openPattern = /\?id=([^&]+)/;
  const openMatch = url.match(openPattern);
  
  if (openMatch && openMatch[1]) {
    return openMatch[1];
  }
  
  // Fallback: look for any ID-like string
  const anyIdPattern = /([a-zA-Z0-9_-]{25,})/;
  const anyMatch = url.match(anyIdPattern);
  if (anyMatch && anyMatch[1]) {
    return anyMatch[1];
  }
  
  return null;
}

/**
 * Generates a download URL for Google Drive files
 */
function generateGoogleDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Creates enhanced document references with view and download URLs
 */
function createDocumentReference(source: EnhancedContextSource): DocumentReference {
  const { document_title, document_url } = source;
  
  if (!document_url) {
    return {
      title: document_title,
      viewUrl: '',
      isGoogleDrive: false
    };
  }
  
  const isGoogleDrive = document_url.includes('drive.google.com');
  
  if (isGoogleDrive) {
    const fileId = extractGoogleDriveFileId(document_url);
    
    if (fileId) {
      return {
        title: document_title,
        viewUrl: document_url,
        downloadUrl: generateGoogleDriveDownloadUrl(fileId),
        isGoogleDrive: true
      };
    }
  }
  
  // For non-Google Drive URLs, use the URL as both view and download
  return {
    title: document_title,
    viewUrl: document_url,
    downloadUrl: document_url,
    isGoogleDrive: false
  };
}

/**
 * Deduplicates document sources and creates enhanced references
 */
function processDocumentSources(sources: EnhancedContextSource[]): DocumentReference[] {
  if (!sources || sources.length === 0) {
    return [];
  }
  
  // Deduplicate by title and URL
  const uniqueSources = sources.reduce((acc, source) => {
    const key = `${source.document_title}|${source.document_url || 'no-url'}`;
    if (!acc.has(key)) {
      acc.set(key, source);
    }
    return acc;
  }, new Map<string, EnhancedContextSource>());
  
  // Convert to enhanced references and filter out sources without URLs
  return Array.from(uniqueSources.values())
    .filter(source => source.document_url)
    .map(source => createDocumentReference(source));
}

/**
 * Generates markdown text for document references (for chat responses)
 */
function generateDocumentReferencesMarkdown(references: DocumentReference[]): string {
  if (references.length === 0) {
    return '';
  }
  
  const referenceLinks = references.map(ref => `- [${ref.title}](${ref.viewUrl})`);
  return '\n\n**Sources:**\n' + referenceLinks.join('\n');
}

/**
 * Detects and removes existing Sources sections from OpenAI response
 * and ensures only one properly formatted Sources section exists
 */
function cleanAndMergeDocumentReferences(assistantResponse: string, documentReferences: string): string {
  if (!documentReferences.trim()) {
    return assistantResponse;
  }
  
  // Regex patterns to detect various Sources section formats (Swedish and English)
  const sourcesPatterns = [
    /\n\n\*\*Sources?:\*\*[\s\S]*$/i,     // **Sources:** or **Source:**
    /\n\n\*\*Källor:\*\*[\s\S]*$/i,       // **Källor:**
    /\n\n\*\*Referenser:\*\*[\s\S]*$/i,  // **Referenser:**
    /\n\n\*\*Källa:\*\*[\s\S]*$/i,       // **Källa:**
    /\n\nSources?:[\s\S]*$/i,            // Sources: or Source:
    /\n\nKällor?:[\s\S]*$/i,             // Källor: or Källa:
    /\n\nReferenser?:[\s\S]*$/i,         // Referenser: or Referens:
  ];
  
  // Remove any existing Sources sections from OpenAI's response
  let cleanedResponse = assistantResponse;
  for (const pattern of sourcesPatterns) {
    cleanedResponse = cleanedResponse.replace(pattern, '');
  }
  
  // Add our properly formatted document references
  return cleanedResponse + documentReferences;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  question: string,
  contextText: string,
  config: ChatConfig,
  relevantDocs?: ContextSource[]
): Promise<string> {
  // Extract document context from previous messages to maintain context memory
  const previousContext = messages
    .filter(msg => msg.role === 'assistant')
    .map(msg => msg.content)
    .join(' ')
  
  const mentionedDocuments = extractDocumentNames(previousContext)
  const currentDocuments = extractDocumentNames(contextText)
  const allRelevantDocs = [...new Set([...mentionedDocuments, ...currentDocuments])]
  
  console.log('Context memory - previously mentioned documents:', mentionedDocuments)
  console.log('Current context documents:', currentDocuments)
  console.log('All relevant documents for this response:', allRelevantDocs)
  
  // Check if this is a document listing query and we have a specific document list response
  const isDocumentListingQuery = /\b(list.*documents|what.*documents|documents.*access|what documents do you have|vilka dokument)\b/i.test(question)
  const hasDocumentListContext = /I have access to \d+ processed document/.test(contextText)
  
  if (isDocumentListingQuery && hasDocumentListContext) {
    // For document listing queries, pass the context directly as the response
    // Do NOT add additional document references to avoid duplication
    console.log('Using document listing context directly as response (no additional references)')
    return contextText
  }
  
  // Create enhanced document references using the new utilities
  let documentReferences = ''
  if (relevantDocs && relevantDocs.length > 0) {
    // Convert ContextSource to EnhancedContextSource format
    const enhancedSources: EnhancedContextSource[] = relevantDocs.map(doc => ({
      document_title: doc.document_title,
      chunk_content: doc.chunk_content,
      similarity: doc.similarity,
      document_url: doc.document_url,
      document_id: doc.document_id
    }))
    
    // Use the new utility functions for better document reference handling
    const documentReferences_processed = processDocumentSources(enhancedSources)
    documentReferences = generateDocumentReferencesMarkdown(documentReferences_processed)
    
    console.log('Enhanced document references created:', documentReferences_processed.length)
  }
  
  // Enhanced system message with better context handling
  const systemMessage = `${config.chatSystemPrompt || 'You are a helpful assistant.'}\n\n` +
    `Document Context:\n${contextText}\n\n` +
    `CRITICAL RESPONSE FORMATTING RULES:\n` +
    `- NEVER include "Sources:", "Källor:", "Referenser:", "Källa:" or any sources section in your response\n` +
    `- Do NOT add document references, citations, or source listings\n` +
    `- Document sources will be automatically added by the system\n` +
    `- Focus only on answering the question based on the provided content\n\n` +
    `IMPORTANT INSTRUCTIONS:\n` +
    `1. You have access to specific document content provided above. Use this content to answer questions directly and comprehensively.\n` +
    `2. When users ask about "the documents", "what documents", or request to "list documents", use the exact information provided in the Document Context above.\n` +
    `3. If you have document content, provide detailed answers based on that content. Include specific information, key points, and relevant details.\n` +
    `4. When summarizing, provide comprehensive summaries that cover the main topics, key points, and important details from the document content.\n` +
    `5. Always be helpful and focus on answering the user's specific questions about the document content.\n` +
    `6. If the user asks specific questions about documents, use the provided content to give detailed and accurate answers.\n` +
    `7. When listing documents, include the specific document names and details provided in the context.\n` +
    `8. You can mention that information comes from specific documents, but do not create any sources section - this is handled automatically.`
  
  // Prepare messages array
  const promptMessages: ChatMessage[] = [
    { role: 'system', content: systemMessage },
    ...messages,
    { role: 'user', content: question }
  ]
  
  if (config.chatProvider === 'openai') {
    console.log('Calling OpenAI API with enhanced context and configuration...')
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.chatModel || 'gpt-4o-mini',
        messages: promptMessages,
        temperature: parseFloat(config.chatTemperature) || 0.7,
        max_tokens: parseInt(config.chatMaxTokens) || 2000,
      }),
    })
    
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', openaiResponse.status, errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData}`)
    }
    
    const openaiData = await openaiResponse.json()
    const assistantResponse = openaiData.choices[0]?.message?.content || 'No response generated.'
    console.log('OpenAI response received with enhanced context')
    
    // Use cleanAndMergeDocumentReferences to prevent duplicate Sources sections
    return cleanAndMergeDocumentReferences(assistantResponse, documentReferences)
  } else {
    console.error('Unsupported chat provider:', config.chatProvider)
    throw new Error(`Unsupported chat provider: ${config.chatProvider}. Please configure OpenAI in the admin settings.`)
  }
}

// Helper function to extract document names from text
function extractDocumentNames(text: string): string[] {
  const docRegex = /Document:\s*([^:\n]+)/g
  const matches = []
  let match
  while ((match = docRegex.exec(text)) !== null) {
    matches.push(match[1].trim())
  }
  return [...new Set(matches)] // Remove duplicates
}
