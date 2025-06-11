
import { ChatMessage, ChatConfig } from './types.ts'

export async function generateChatResponse(
  messages: ChatMessage[],
  question: string,
  contextText: string,
  config: ChatConfig
): Promise<string> {
  // Prepare system message with context
  const systemMessage = `${config.chatSystemPrompt || 'You are a helpful assistant.'}\n\n` +
    `Document Context:\n${contextText}\n\n` +
    'Use the provided document context to answer questions about the documents. If you have specific content from documents, use it to provide detailed answers. If no content is available, explain what documents are available and suggest the user contact support if documents should contain content but appear empty.'
  
  // Prepare messages array
  const promptMessages: ChatMessage[] = [
    { role: 'system', content: systemMessage },
    ...messages,
    { role: 'user', content: question }
  ]
  
  if (config.chatProvider === 'openai') {
    console.log('Calling OpenAI API with configured parameters...')
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
    console.log('OpenAI response received')
    return assistantResponse
  } else {
    console.error('Unsupported chat provider:', config.chatProvider)
    throw new Error(`Unsupported chat provider: ${config.chatProvider}. Please configure OpenAI in the admin settings.`)
  }
}
