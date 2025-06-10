
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
      
      // Debug: Check what documents are available
      const { data: availableDocuments, error: docError } = await supabase
        .from('processed_documents')
        .select('id, title, url, status')
        .eq('status', 'completed')
      
      if (docError) {
        console.error('Error fetching documents:', docError)
      } else {
        console.log('Available documents:', availableDocuments?.map(d => ({ id: d.id, title: d.title })) || [])
      }
      
      // Debug: Check what chunks exist
      const { data: allChunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('id, document_id, chunk_index, content')
        .limit(5)
      
      if (chunksError) {
        console.error('Error fetching chunks:', chunksError)
      } else {
        console.log('Sample chunks:', allChunks?.map(c => ({ 
          id: c.id, 
          doc_id: c.document_id, 
          chunk_index: c.chunk_index,
          content_length: c.content?.length || 0,
          content_preview: c.content?.substring(0, 100) || 'No content'
        })) || [])
      }
      
      // Debug: Check what embeddings exist
      const { data: allEmbeddings, error: embError } = await supabase
        .from('document_embeddings')
        .select('id, document_id, chunk_id')
        .limit(5)
      
      if (embError) {
        console.error('Error fetching embeddings:', embError)
      } else {
        console.log('Sample embeddings:', allEmbeddings?.length || 0, 'total embeddings found')
      }
      
      // Try vector search with very low threshold
      console.log('Attempting vector search...')
      const { data: searchResults, error: searchError } = await supabase
        .rpc('search_similar_embeddings', {
          query_embedding: queryEmbedding,
          similarity_threshold: 0.1,
          match_count: 5
        })
      
      if (searchError) {
        console.error('Vector search error:', searchError)
      } else {
        console.log('Vector search results:', searchResults?.length || 0)
        if (searchResults && searchResults.length > 0) {
          console.log('Search results details:', searchResults.map(r => ({
            similarity: r.similarity,
            doc_title: r.document_title,
            content_length: r.chunk_content?.length || 0
          })))
          
          relevantDocs = searchResults.map(result => ({
            document_title: result.document_title,
            chunk_content: result.chunk_content,
            similarity: result.similarity
          }))
          
          contextText = searchResults
            .map(result => `Document: ${result.document_title}\nContent: ${result.chunk_content}`)
            .join('\n\n')
          
          console.log('Found relevant content via vector search, total context length:', contextText.length)
        }
      }
      
      // If vector search didn't work, try direct chunk retrieval
      if (!contextText && availableDocuments && availableDocuments.length > 0) {
        console.log('Fallback: Getting document content directly from chunks...')
        
        // Get chunks with proper joins
        const { data: documentChunks, error: chunksError } = await supabase
          .from('document_chunks')
          .select(`
            id,
            content,
            chunk_index,
            processed_documents!inner(title, url, id)
          `)
          .in('document_id', availableDocuments.map(d => d.id))
          .order('chunk_index', { ascending: true })
          .limit(10)
        
        if (chunksError) {
          console.error('Error fetching document chunks:', chunksError)
        } else {
          console.log('Found document chunks via fallback:', documentChunks?.length || 0)
          
          if (documentChunks && documentChunks.length > 0) {
            console.log('Chunk details:', documentChunks.map(c => ({
              id: c.id,
              doc_title: c.processed_documents?.title,
              chunk_index: c.chunk_index,
              content_length: c.content?.length || 0,
              has_content: !!c.content
            })))
            
            // Group chunks by document and create context
            const documentContentMap = new Map()
            
            documentChunks.forEach(chunk => {
              const docTitle = chunk.processed_documents?.title
              if (docTitle && chunk.content) {
                if (!documentContentMap.has(docTitle)) {
                  documentContentMap.set(docTitle, [])
                }
                documentContentMap.get(docTitle).push({
                  content: chunk.content,
                  chunk_index: chunk.chunk_index
                })
              }
            })
            
            // Create context from document chunks
            const contextParts = []
            for (const [title, chunks] of documentContentMap.entries()) {
              // Sort chunks by index and combine
              chunks.sort((a, b) => a.chunk_index - b.chunk_index)
              const combinedContent = chunks.map(c => c.content).join(' ').substring(0, 2000)
              contextParts.push(`Document: ${title}\nContent: ${combinedContent}`)
              
              relevantDocs.push({
                document_title: title,
                chunk_content: combinedContent
              })
            }
            
            contextText = contextParts.join('\n\n')
            console.log('Using direct document chunks as context, total length:', contextText.length)
          }
        }
      }
      
      // Final fallback - just list available documents
      if (!contextText && availableDocuments && availableDocuments.length > 0) {
        const docList = availableDocuments.map(d => d.title).join(', ')
        contextText = `I have access to the following documents: ${docList}. However, I was unable to retrieve the content from these documents. This could be due to processing issues or empty content.`
        console.log('Using document list as context')
      } else if (!contextText) {
        contextText = 'I do not have access to any processed documents at the moment.'
        console.log('No documents or content available')
      }
      
    } catch (searchErr) {
      console.error('Document search error:', searchErr)
      contextText = 'I encountered an issue while trying to access document content. Please try again or contact support if the issue persists.'
    }
    
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
