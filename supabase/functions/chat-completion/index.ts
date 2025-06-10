
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'
import { Anthropic } from 'https://esm.sh/@anthropic-ai/sdk@0.12.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  sessionId: string
  messages: ChatMessage[]
  question: string
}

interface ChatConfig {
  chatProvider: string
  model: string
  apiKey: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  systemPrompt: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, messages, question } = await req.json() as ChatRequest
    
    // Get Supabase client with auth context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get user from auth token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Load chat configuration from database
    const { data: configData } = await supabase
      .from('configurations')
      .select('value')
      .eq('key', 'chat_settings')
      .maybeSingle()
      
    if (!configData?.value) {
      return new Response(
        JSON.stringify({ error: 'Chat configuration not found' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    const config = configData.value as ChatConfig
    
    if (!config.apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured for chat provider' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Use vector search to find relevant document chunks for the question
    const { data: relevantDocs, error: searchError } = await supabase.rpc(
      'search_similar_embeddings',
      { 
        query_embedding: `[0.1, 0.2]`, // Placeholder - in a real implementation we'd get embeddings for the query
        similarity_threshold: 0.7,
        match_count: 5
      }
    )
    
    if (searchError) {
      console.error('Error searching embeddings:', searchError)
      // Continue without context if search fails
    }
    
    // Prepare context from relevant documents
    let contextText = ''
    if (relevantDocs && relevantDocs.length > 0) {
      contextText = relevantDocs
        .map(doc => `Document: ${doc.document_title}\n${doc.chunk_content}`)
        .join('\n\n')
    }
    
    // Prepare system message with context
    const systemMessage = `${config.systemPrompt || 'You are a helpful assistant.'}\n\n` +
      (contextText ? `Context information from knowledge base:\n${contextText}\n\n` +
      'Use this context to answer the user query. If the context doesn\'t contain relevant information, respond based on your general knowledge.' : '')
    
    // Prepare messages array based on the provider
    const promptMessages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...messages
    ]
    
    // Send to appropriate chat provider
    let assistantResponse = ''
    
    if (config.chatProvider === 'openai') {
      const openai = new OpenAIApi(new Configuration({ apiKey: config.apiKey }))
      const response = await openai.createChatCompletion({
        model: config.model || 'gpt-3.5-turbo',
        messages: promptMessages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1000,
        top_p: config.topP || 1,
        frequency_penalty: config.frequencyPenalty || 0,
        presence_penalty: config.presencePenalty || 0,
      })
      
      assistantResponse = response.data.choices[0]?.message?.content || 'No response generated.'
    } 
    else if (config.chatProvider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: config.apiKey })
      
      // Convert the messages to Anthropic format
      const combinedPrompt = promptMessages.map(msg => {
        if (msg.role === 'system') return msg.content
        return msg.role === 'user' ? `Human: ${msg.content}` : `Assistant: ${msg.content}`
      }).join('\n\n')
      
      const response = await anthropic.completions.create({
        model: config.model || 'claude-2',
        prompt: `${combinedPrompt}\n\nHuman: ${question}\n\nAssistant:`,
        max_tokens_to_sample: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        top_p: config.topP || 1,
      })
      
      assistantResponse = response.completion || 'No response generated.'
    }
    else {
      return new Response(
        JSON.stringify({ error: `Unsupported chat provider: ${config.chatProvider}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Store messages in database
    
    let messageId: string | null = null
    
    // If no session exists yet, create one
    let currentSessionId = sessionId
    
    if (!currentSessionId) {
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ 
          user_id: user.id,
          title: question.slice(0, 100) // Use first part of question as title
        })
        .select('id')
        .single()
      
      if (sessionError) {
        console.error('Error creating chat session:', sessionError)
        // Continue without session if creation fails
      } else {
        currentSessionId = sessionData.id
      }
    }
    
    // Store user message
    if (currentSessionId) {
      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSessionId,
          role: 'user',
          content: question
        })
      
      if (userMsgError) {
        console.error('Error saving user message:', userMsgError)
      }
      
      // Store assistant message
      const { data: assistantMsgData, error: assistantMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: assistantResponse
        })
        .select('id')
        .single()
        
      if (assistantMsgError) {
        console.error('Error saving assistant message:', assistantMsgError)
      } else {
        messageId = assistantMsgData.id
        
        // Store message context links to relevant documents
        if (messageId && relevantDocs && relevantDocs.length > 0) {
          const contextRecords = relevantDocs.map(doc => ({
            message_id: messageId,
            document_id: doc.document_id,
            chunk_id: doc.chunk_id,
            similarity_score: doc.similarity
          }))
          
          const { error: contextError } = await supabase
            .from('chat_contexts')
            .insert(contextRecords)
            
          if (contextError) {
            console.error('Error saving message context:', contextError)
          }
        }
      }
    }
    
    // Return the response
    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        sessionId: currentSessionId,
        messageId,
        context: relevantDocs ? relevantDocs.map(d => ({
          title: d.document_title,
          content: d.chunk_content
        })) : []
      }),
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
