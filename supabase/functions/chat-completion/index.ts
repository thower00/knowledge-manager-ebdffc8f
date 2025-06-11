
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
    console.log('Chat request received:', { 
      sessionId, 
      messageCount: messages.length, 
      question: question.slice(0, 100) + (question.length > 100 ? '...' : '')
    })
    
    // Log conversation context for debugging
    if (messages.length > 0) {
      const lastFewMessages = messages.slice(-2)
      console.log('Recent conversation context:', lastFewMessages.map(m => ({
        role: m.role,
        content: m.content.slice(0, 100) + (m.content.length > 100 ? '...' : '')
      })))
    }
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    const { user, supabase } = await authenticateUser(authHeader)
    
    // Load configuration
    const config = await loadConfiguration(supabase)
    console.log('Using configuration:', {
      chatProvider: config.chatProvider,
      chatModel: config.chatModel,
      similarityThreshold: config.similarityThreshold,
      embeddingBatchSize: config.embeddingBatchSize
    })
    
    // Perform enhanced vector search for relevant documents
    console.log('Starting enhanced document search...')
    const startTime = Date.now()
    const { contextText, relevantDocs } = await performVectorSearch(supabase, question, config)
    const searchTime = Date.now() - startTime
    
    console.log('Document search completed:', {
      searchDuration: `${searchTime}ms`,
      contextLength: contextText.length,
      documentsFound: relevantDocs.length,
      documentTitles: relevantDocs.map(doc => doc.document_title)
    })
    
    // Generate chat response with enhanced context
    console.log('Generating AI response with enhanced context...')
    const responseStartTime = Date.now()
    const assistantResponse = await generateChatResponse(messages, question, contextText, config)
    const responseTime = Date.now() - responseStartTime
    
    console.log('AI response generated:', {
      responseDuration: `${responseTime}ms`,
      responseLength: assistantResponse.length
    })
    
    // Store messages in database
    const { sessionId: currentSessionId, messageId } = await storeMessages(
      supabase,
      sessionId,
      question,
      assistantResponse,
      user.id
    )
    
    // Return the response with enhanced context information
    const response = {
      response: assistantResponse,
      sessionId: currentSessionId,
      messageId,
      context: relevantDocs,
      debug: {
        searchTime: `${searchTime}ms`,
        responseTime: `${responseTime}ms`,
        contextLength: contextText.length,
        documentsUsed: relevantDocs.length
      }
    }
    
    console.log('Chat completion successful with enhanced processing')
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
