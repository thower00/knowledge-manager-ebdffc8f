
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
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
  chatModel: string
  apiKey: string
  chatTemperature: string
  chatMaxTokens: string
  chatSystemPrompt: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, messages, question } = await req.json() as ChatRequest
    console.log('Chat request received:', { sessionId, messageCount: messages.length, question: question.slice(0, 50) + '...' })
    
    // Get Supabase client with auth context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing Authorization header')
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
      console.error('Invalid user token:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    console.log('User authenticated:', user.id)
    
    // Load chat configuration from database
    const { data: configData, error: configError } = await supabase
      .from('configurations')
      .select('value')
      .eq('key', 'chat_settings')
      .maybeSingle()
      
    if (configError) {
      console.error('Error loading chat config:', configError)
      return new Response(
        JSON.stringify({ error: 'Error loading chat configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
      
    if (!configData?.value) {
      console.error('Chat configuration not found')
      return new Response(
        JSON.stringify({ error: 'Chat configuration not found. Please configure your AI provider in the admin settings.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    const config = configData.value as ChatConfig
    console.log('Config loaded:', { provider: config.chatProvider, model: config.chatModel })
    
    if (!config.apiKey) {
      console.error('API key not configured')
      return new Response(
        JSON.stringify({ error: 'API key not configured for chat provider. Please add your API key in the admin settings.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Generate embedding for the user question and search for relevant documents
    let contextText = ''
    let relevantDocs: any[] = []
    
    try {
      console.log('Generating embedding for question...')
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
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
      
      // Check what embeddings we have in the database first
      const { data: embeddingCount, error: countError } = await supabase
        .from('document_embeddings')
        .select('id, document_id, embedding_model, embedding_provider', { count: 'exact' })
        
      if (countError) {
        console.error('Error counting embeddings:', countError)
      } else {
        console.log('Total embeddings in database:', embeddingCount?.length || 0)
        if (embeddingCount && embeddingCount.length > 0) {
          console.log('Sample embeddings:', embeddingCount.slice(0, 3).map(e => ({
            id: e.id,
            model: e.embedding_model,
            provider: e.embedding_provider
          })))
        }
      }
      
      // Try to search using the RPC function with proper vector format
      console.log('Searching for similar embeddings...')
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_similar_embeddings',
        { 
          query_embedding: queryEmbedding, // Pass as array directly
          similarity_threshold: 0.1, // Very low threshold for testing
          match_count: 5
        }
      )
      
      console.log('Search completed')
      console.log('Search error:', searchError)
      console.log('Search results count:', searchResults?.length || 0)
      
      if (searchError) {
        console.warn('Vector search failed:', searchError)
        console.warn('Search error details:', JSON.stringify(searchError))
      }
      
      if (searchResults && searchResults.length > 0) {
        relevantDocs = searchResults
        contextText = searchResults
          .map(doc => `Document: ${doc.document_title}\nContent: ${doc.chunk_content}`)
          .join('\n\n')
        console.log('Found relevant documents:', searchResults.length)
        console.log('First document:', searchResults[0]?.document_title)
      } else {
        console.log('No relevant documents found')
        
        // Get sample documents for context
        const { data: sampleDocs, error: sampleError } = await supabase
          .from('document_embeddings')
          .select(`
            document_id,
            processed_documents!inner(title)
          `)
          .limit(5)
          
        if (!sampleError && sampleDocs && sampleDocs.length > 0) {
          const uniqueTitles = [...new Set(sampleDocs.map(d => d.processed_documents?.title).filter(Boolean))]
          contextText = `I have access to ${embeddingCount?.length || 0} document embeddings from ${uniqueTitles.length} documents including: ${uniqueTitles.slice(0, 3).join(', ')}${uniqueTitles.length > 3 ? ' and others' : ''}. However, I didn't find content specifically relevant to your current question. You can ask me about any topics covered in these documents.`
          console.log('Using fallback context with document titles:', uniqueTitles.slice(0, 3))
        } else {
          contextText = `I have access to document embeddings in the knowledge base, but didn't find content specifically relevant to your current question.`
        }
      }
    } catch (searchErr) {
      console.warn('Vector search error:', searchErr)
      contextText = 'I have access to document embeddings but encountered an issue searching for relevant content.'
    }
    
    // Prepare system message with context
    const systemMessage = `${config.chatSystemPrompt || 'You are a helpful assistant.'}\n\n` +
      `Context information:\n${contextText}\n\n` +
      'When asked about document access, refer to the context information provided above. Use this context to answer user queries accurately.'
    
    // Prepare messages array
    const promptMessages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...messages,
      { role: 'user', content: question }
    ]
    
    // Send to OpenAI
    let assistantResponse = ''
    
    if (config.chatProvider === 'openai') {
      console.log('Calling OpenAI API...')
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
          max_tokens: parseInt(config.chatMaxTokens) || 1000,
        }),
      })
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text()
        console.error('OpenAI API error:', openaiResponse.status, errorData)
        return new Response(
          JSON.stringify({ error: `OpenAI API error: ${openaiResponse.status} - ${errorData}` }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
      
      const openaiData = await openaiResponse.json()
      assistantResponse = openaiData.choices[0]?.message?.content || 'No response generated.'
      console.log('OpenAI response received')
    } 
    else {
      console.error('Unsupported chat provider:', config.chatProvider)
      return new Response(
        JSON.stringify({ error: `Unsupported chat provider: ${config.chatProvider}. Please configure OpenAI in the admin settings.` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    // Store messages in database
    let messageId: string | null = null
    let currentSessionId = sessionId
    
    // If no session exists yet, create one
    if (!currentSessionId) {
      console.log('Creating new chat session...')
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
      } else {
        currentSessionId = sessionData.id
        console.log('New session created:', currentSessionId)
      }
    }
    
    // Store user message and assistant response
    if (currentSessionId) {
      console.log('Storing messages to database...')
      
      // Store user message
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
        console.log('Messages saved successfully')
      }
    }
    
    // Return the response
    const response = {
      response: assistantResponse,
      sessionId: currentSessionId,
      messageId,
      context: relevantDocs ? relevantDocs.map(d => ({
        title: d.document_title,
        content: d.chunk_content
      })) : []
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
