import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { ChatRequest } from './types.ts'
import { generateChatResponse } from './chatProvider.ts'
import { performVectorSearch } from './vectorSearch.ts'

const loadChatConfig = async (supabaseClient: any) => {
  console.log('=== Loading chat configuration from database ===')
  
  const { data, error } = await supabaseClient
    .from('configurations')
    .select('value')
    .eq('key', 'chat_settings')
    .maybeSingle()

  if (error) {
    console.error('Database error loading chat config:', error)
    throw new Error(`Database error loading chat configuration: ${error.message}`)
  }

  if (!data) {
    console.warn('No chat configuration found in database')
    // Return default configuration
    return {
      chatProvider: 'openai',
      chatModel: 'gpt-4o-mini',
      apiKey: '', // Will be handled in the chat provider
      chatTemperature: '0.7',
      chatMaxTokens: '2000',
      chatSystemPrompt: 'You are a helpful AI assistant that can answer questions based on document content.',
      provider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      similarityThreshold: '0.7',
      embeddingBatchSize: '10'
    }
  }

  console.log('Chat configuration loaded from database successfully')
  console.log('Configuration keys found:', Object.keys(data.value))
  console.log('Chat provider:', data.value.chatProvider)
  console.log('Chat model:', data.value.chatModel)
  console.log('Has API key:', !!data.value.apiKey)
  console.log('API key length:', data.value.apiKey?.length || 0)

  return data.value
}

const storeMessages = async (supabaseClient: any, sessionId: string, messages: { role: string; content: string }[], relevantDocs: any[]) => {
  try {
    // Store chat messages
    const messagesToStore = messages.map(msg => ({
      session_id: sessionId,
      role: msg.role,
      content: msg.content
    }))

    const { error: messagesError } = await supabaseClient
      .from('chat_messages')
      .insert(messagesToStore)

    if (messagesError) {
      console.error('Error saving chat messages:', messagesError)
      throw messagesError
    }

    // Store document context references
    const contextToStore = relevantDocs.map(doc => ({
      session_id: sessionId,
      document_id: doc.document_id,
      document_title: doc.document_title,
      chunk_content: doc.chunk_content,
      similarity: doc.similarity,
      document_url: doc.document_url
    }))

    const { error: contextError } = await supabaseClient
      .from('chat_context')
      .insert(contextToStore)

    if (contextError) {
      console.warn('Error saving chat context:', contextError)
    }

  } catch (error) {
    console.error('Error in storeMessages:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    console.log('=== Chat completion request started ===')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      throw new Error('Missing Supabase URL or key')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    })

    // Authenticate the user
    console.log('=== Authenticating user ===')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jwt = authHeader.split(' ')[1]
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)

    if (userError) {
      console.error('Authentication error:', userError)
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('User authenticated:', user.id)

    // Parse the request body
    console.log('=== Parsing request body ===')
    const requestBody = await req.json() as ChatRequest
    const { messages, question, sessionId } = requestBody

    if (!question) {
      console.error('No question provided in request')
      return new Response(JSON.stringify({ error: 'Missing question parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages parameter:', messages)
      return new Response(JSON.stringify({ error: 'Invalid messages parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Request parsed successfully:', {
      questionLength: question.length,
      messageCount: messages.length,
      sessionId
    })

    try {
      console.log('=== Loading configuration ===')
      
      // Load configuration from database
      const config = await loadChatConfig(supabase);
      
      console.log('Configuration loaded successfully:', {
        provider: config.chatProvider,
        model: config.chatModel,
        temperature: config.chatTemperature,
        maxTokens: config.chatMaxTokens,
        embeddingProvider: config.provider,
        embeddingModel: config.embeddingModel || config.specificModelId,
        similarityThreshold: config.similarityThreshold
      });

      console.log('=== Checking API key ===')
      
      // Check if we have API key from config or environment
      const apiKey = config.apiKey || config.chatProviderApiKeys?.openai || Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) {
        console.error('No API key found in config or environment')
        return new Response(JSON.stringify({ 
          error: 'OpenAI API key not configured. Please set up your API key in the admin settings.' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Add API key to config
      config.apiKey = apiKey
      console.log('API key configured successfully, length:', apiKey.length)

      console.log('=== Managing chat session ===')

      // Get or create chat session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        console.log('Creating new chat session...')
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: question.slice(0, 50) + (question.length > 50 ? '...' : '')
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Session creation failed:', sessionError)
          throw sessionError;
        }
        currentSessionId = newSession.id;
        console.log('New session created:', currentSessionId);
      } else {
        console.log('Using existing session:', currentSessionId);
      }

      console.log('=== Loading conversation history ===')
      
      // Load recent conversation context (last 10 messages)
      const { data: recentMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messagesError) {
        console.error('Error loading recent messages:', messagesError);
      }

      const conversationHistory = recentMessages ? recentMessages.reverse() : [];
      console.log('Conversation history loaded:', conversationHistory.length, 'messages');

      // Combine provided messages with recent conversation
      const allMessages = [...conversationHistory, ...messages];

      console.log('=== Starting document search ===');
      const searchStartTime = Date.now();
      
      let contextText = '';
      let relevantDocs = [];
      
      try {
        console.log('Calling performVectorSearch with config:', {
          embeddingProvider: config.provider,
          embeddingModel: config.embeddingModel,
          similarityThreshold: config.similarityThreshold
        });
        
        const searchResult = await performVectorSearch(
          supabase,
          question,
          config
        );
        
        contextText = searchResult.contextText;
        relevantDocs = searchResult.relevantDocs;
        
        const searchDuration = Date.now() - searchStartTime;
        console.log('Document search completed successfully:', {
          searchDuration: `${searchDuration}ms`,
          contextLength: contextText.length,
          documentsFound: relevantDocs.length,
          documentTitles: relevantDocs.map(doc => doc.document_title)
        });
        
      } catch (vectorSearchError) {
        console.error('=== Vector search failed ===');
        console.error('Vector search error details:', {
          message: vectorSearchError.message,
          stack: vectorSearchError.stack,
          name: vectorSearchError.name
        });
        
        // Continue without vector search - use empty context
        console.log('Continuing without document context due to vector search failure');
        contextText = 'No document context available due to search system issues.';
        relevantDocs = [];
      }

      console.log('=== Generating AI response ===');
      const responseStartTime = Date.now();
      
      const aiResponse = await generateChatResponse(
        allMessages,
        question,
        contextText,
        config,
        relevantDocs
      );
      
      const responseDuration = Date.now() - responseStartTime;
      console.log('AI response generated:', {
        responseDuration: `${responseDuration}ms`,
        responseLength: aiResponse.length
      });

      console.log('=== Storing messages ===');
      await storeMessages(supabase, currentSessionId, [
        { role: 'user', content: question },
        { role: 'assistant', content: aiResponse }
      ], relevantDocs);

      console.log('=== Chat completion successful ===');

      return new Response(
        JSON.stringify({
          response: aiResponse,
          sessionId: currentSessionId,
          context: relevantDocs.map(doc => ({
            title: doc.document_title,
            content: doc.chunk_content.substring(0, 500) + '...'
          }))
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (error) {
      console.error('=== Chat completion error ===:', error);
      console.error('Error stack:', error.stack);
      return new Response(
        JSON.stringify({
          error: error.message || 'Internal server error',
          details: error.stack
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error('=== Function error ===:', error)
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
