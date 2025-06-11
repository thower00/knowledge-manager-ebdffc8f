
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
  
  // Enhanced system message with better context handling
  const systemMessage = `${config.chatSystemPrompt || 'You are a helpful assistant.'}\n\n` +
    `Document Context:\n${contextText}\n\n` +
    `IMPORTANT INSTRUCTIONS:\n` +
    `1. You have access to specific document content provided above. Use this content to answer questions directly and comprehensively.\n` +
    `2. When users ask about "the document" or request summaries, always refer to the documents you have access to: ${allRelevantDocs.length > 0 ? allRelevantDocs.join(', ') : 'the available documents'}.\n` +
    `3. If you have document content, provide detailed answers based on that content. Include specific information, key points, and relevant details.\n` +
    `4. If no specific content is available but documents exist, explain what documents are available and suggest the user ask more specific questions.\n` +
    `5. Always be consistent - if you could access a document in previous messages, you should still be able to access it unless explicitly told otherwise.\n` +
    `6. When summarizing, provide comprehensive summaries that cover the main topics, key points, and important details from the document content.`
  
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
