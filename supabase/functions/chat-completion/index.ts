
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { authenticateUser } from './auth.ts'
import { getChatConfig } from './config.ts'
import { performVectorSearch } from './vectorSearch.ts'
import { generateChatResponse } from './chatProvider.ts'
import { manageSession, storeMessagesToDatabase } from './messageStorage.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Chat completion request started ===')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // =========================
    // 1. AUTHENTICATE USER
    // =========================
    console.log('=== Authenticating user ===')
    const user = await authenticateUser(req, supabase)
    console.log('User authenticated successfully:', user.id)

    // =========================
    // 2. PARSE REQUEST BODY
    // =========================
    console.log('=== Parsing request body ===')
    const { sessionId, messages, question } = await req.json()
    
    console.log('Request parsed successfully:', {
      questionLength: question?.length || 0,
      messageCount: messages?.length || 0,
      sessionId: sessionId || null,
      userId: user.id
    })

    // =========================
    // 3. LOAD CONFIGURATION
    // =========================
    console.log('=== Loading configuration ===')
    const config = await getChatConfig(supabase)
    console.log('Configuration loaded successfully:', {
      chatProvider: config.chatProvider,
      chatModel: config.chatModel,
      chatTemperature: config.chatTemperature,
      chatMaxTokens: config.chatMaxTokens,
      embeddingProvider: config.embeddingProvider,
      embeddingModel: config.embeddingModel,
      similarityThreshold: config.similarityThreshold,
      hasApiKey: !!config.apiKey
    })

    // =========================
    // 4. MANAGE CHAT SESSION
    // =========================
    console.log('=== Managing chat session ===')
    const currentSessionId = await manageSession(supabase, user.id, sessionId, question)
    console.log('Session management complete:', currentSessionId)

    // =========================
    // 5. LOAD CONVERSATION HISTORY
    // =========================
    console.log('=== Loading conversation history ===')
    const { data: conversationHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })

    if (historyError) {
      console.error('Error loading conversation history:', historyError)
      throw new Error('Failed to load conversation history')
    }

    const messageHistory = conversationHistory || []
    console.log('Conversation history loaded:', messageHistory.length, 'messages')

    // =========================
    // 6. PERFORM DOCUMENT SEARCH
    // =========================
    console.log('=== Starting document search ===')
    const vectorSearchResult = await performVectorSearch(
      supabase,
      question,
      config
    )

    console.log('Document search completed successfully:', {
      searchDuration: `${vectorSearchResult.searchDuration}ms`,
      contextLength: vectorSearchResult.contextText.length,
      documentsFound: vectorSearchResult.relevantDocs.length,
      documentTitles: vectorSearchResult.relevantDocs.map(doc => doc.document_title)
    })

    // =========================
    // 7. GENERATE AI RESPONSE
    // =========================
    console.log('=== Generating AI response ===')
    const startResponseTime = Date.now()
    
    const aiResponse = await generateChatResponse(
      messageHistory,
      question,
      vectorSearchResult.contextText,
      config,
      vectorSearchResult.relevantDocs
    )
    
    const responseDuration = Date.now() - startResponseTime
    console.log('AI response generated:', {
      responseDuration: `${responseDuration}ms`,
      responseLength: aiResponse.length
    })

    // =========================
    // 8. STORE MESSAGES
    // =========================
    console.log('=== Storing messages ===')
    await storeMessagesToDatabase(supabase, currentSessionId, question, aiResponse)

    console.log('=== Chat completion successful ===')

    // =========================
    // 9. PREPARE ENHANCED RESPONSE WITH DOCUMENT SOURCES
    // =========================
    
    // Process document sources for frontend display
    const enhancedSources = vectorSearchResult.relevantDocs.map(doc => ({
      title: doc.document_title,
      content: doc.chunk_content.substring(0, 300) + (doc.chunk_content.length > 300 ? '...' : ''),
      viewUrl: doc.document_url,
      downloadUrl: doc.document_url && doc.document_url.includes('drive.google.com') 
        ? `https://drive.google.com/uc?export=download&id=${extractGoogleDriveFileId(doc.document_url)}`
        : doc.document_url,
      isGoogleDrive: doc.document_url?.includes('drive.google.com') || false
    })).filter((source, index, self) => 
      // Deduplicate by title
      index === self.findIndex(s => s.title === source.title)
    )

    console.log('Enhanced sources prepared for frontend:', enhancedSources.length)

    return new Response(
      JSON.stringify({
        response: aiResponse,
        sessionId: currentSessionId,
        context: enhancedSources
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Chat completion error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred during chat completion'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Helper function to extract Google Drive file ID
function extractGoogleDriveFileId(url: string): string | null {
  if (!url || !url.includes('drive.google.com')) {
    return null;
  }
  
  const filePattern = /\/file\/d\/([^/]+)/;
  const fileMatch = url.match(filePattern);
  
  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }
  
  return null;
}
