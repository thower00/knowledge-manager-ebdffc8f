
import { ChatMessage, ChatConfig } from './types.ts'

export async function generateChatResponse(
  messages: ChatMessage[],
  question: string,
  contextText: string,
  config: ChatConfig
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
  
  // Enhanced system message with better context handling and comprehensive document listing
  const systemMessage = `${config.chatSystemPrompt || 'You are a helpful assistant.'}\n\n` +
    `Document Context:\n${contextText}\n\n` +
    `IMPORTANT INSTRUCTIONS:\n` +
    `1. You have access to specific document content provided above. Use this content to answer questions directly and comprehensively.\n` +
    `2. When users ask about "the documents", "what documents", or request to "list documents", provide a complete list of ALL documents you have access to. Based on the context provided, you have access to: ${allRelevantDocs.length > 0 ? allRelevantDocs.join(', ') : 'the available documents'}.\n` +
    `3. When listing documents, format them clearly with bullet points or numbered lists for better readability. ALWAYS list ALL documents mentioned in the context, not just some of them.\n` +
    `4. If you have document content, provide detailed answers based on that content. Include specific information, key points, and relevant details.\n` +
    `5. If multiple documents are available, mention ALL of them when asked about document access. Do not omit any documents.\n` +
    `6. Always be consistent - if you could access documents in previous messages, you should still be able to access them unless explicitly told otherwise.\n` +
    `7. When summarizing, provide comprehensive summaries that cover the main topics, key points, and important details from the document content.\n` +
    `8. For document listing queries, be thorough and include ALL available documents found in the context, ensuring complete coverage.\n` +
    `9. If the context shows multiple different document titles, make sure to list each one individually and completely.`
  
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
    return assistantResponse
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
