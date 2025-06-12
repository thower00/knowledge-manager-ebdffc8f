import { serve } from 'std/server'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from '@supabase/supabase-js'
import { ChatRequest } from './types.ts'
import { generateChatResponse } from './chatProvider.ts'
import { performVectorSearch } from './vectorSearch.ts'

const loadChatConfig = async (supabaseClient: any) => {
  const { data, error } = await supabaseClient
    .from('configurations')
    .select('value')
    .eq('key', 'chat_settings')
    .single()

  if (error) {
    console.error('Error fetching chat config:', error)
    throw new Error('Failed to load chat configuration')
  }

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase URL or key')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    })

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
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

    // Parse the request body
    const requestBody = await req.json() as ChatRequest
    const { messages, question, sessionId } = requestBody

    if (!question) {
      return new Response(JSON.stringify({ error: 'Missing question parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    try {
    console.log('User authenticated:', user.id);
    
    // Load configuration
    const config = await loadChatConfig(supabase);
    console.log('Config loaded:', {
      provider: config.chatProvider,
      model: config.chatModel,
      temperature: config.chatTemperature,
      maxTokens: config.chatMaxTokens,
      embeddingProvider: config.provider,
      embeddingModel: config.embeddingModel,
      similarityThreshold: config.similarityThreshold
    });

    console.log('Using configuration:', {
      chatProvider: config.chatProvider,
      chatModel: config.chatModel,
      similarityThreshold: config.similarityThreshold,
      embeddingBatchSize: config.embeddingBatchSize
    });

    // Get or create chat session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: question.slice(0, 50) + (question.length > 50 ? '...' : '')
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      currentSessionId = newSession.id;
      console.log('Created new session:', currentSessionId);
    }

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
    console.log('Recent conversation context:', conversationHistory.slice(-2));

    // Combine provided messages with recent conversation
    const allMessages = [...conversationHistory, ...messages];

    console.log('Chat request received:', {
      sessionId: currentSessionId,
      messageCount: allMessages.length,
      question: question
    });

    // Perform enhanced document search
    console.log('Starting enhanced document search...');
    const searchStartTime = Date.now();
    
    const { contextText, relevantDocs } = await performVectorSearch(
      supabase,
      question,
      config
    );
    
    const searchDuration = Date.now() - searchStartTime;
    console.log('Document search completed:', {
      searchDuration: `${searchDuration}ms`,
      contextLength: contextText.length,
      documentsFound: relevantDocs.length,
      documentTitles: relevantDocs.map(doc => doc.document_title)
    });

    // Generate AI response with enhanced context
    console.log('Generating AI response with enhanced context...');
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

    // Store messages to database
    console.log('Storing messages to database...');
    await storeMessages(supabase, currentSessionId, [
      { role: 'user', content: question },
      { role: 'assistant', content: aiResponse }
    ], relevantDocs);

    console.log('Messages saved successfully');
    console.log('Chat completion successful with enhanced processing');

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
    console.error('Chat completion error:', error);
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
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
