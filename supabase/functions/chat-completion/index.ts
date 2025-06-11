
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { ChatRequest, ContextSource } from './types.ts'
import { authenticateUser } from './auth.ts'
import { loadConfiguration } from './config.ts'
import { performVectorSearch } from './vectorSearch.ts'
import { generateChatResponse } from './chatProvider.ts'
import { storeMessages } from './messageStorage.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, messages, question } = await req.json() as ChatRequest
    console.log('Chat request received:', { sessionId, messageCount: messages.length, question: question.slice(0, 50) + '...' })
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    const { user, supabase } = await authenticateUser(authHeader)
    
    // Load configuration
    const config = await loadConfiguration(supabase)
    
    // Perform vector search for relevant documents
    const { contextText, relevantDocs } = await performVectorSearch(supabase, question, config)
    
    // Generate chat response
    const assistantResponse = await generateChatResponse(messages, question, contextText, config)
    
    // Store messages in database
    const { sessionId: currentSessionId, messageId } = await storeMessages(
      supabase,
      sessionId,
      question,
      assistantResponse,
      user.id
    )
    
    // Return the response
    const response = {
      response: assistantResponse,
      sessionId: currentSessionId,
      messageId,
      context: relevantDocs
    }
    
    console.log('Chat completion successful')
    return new Response(
      JSON.stringify(response),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('Error processing chat request:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
