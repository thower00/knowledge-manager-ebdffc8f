
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { authenticateUser } from './auth.ts'
import { getCombinedConfig } from './config.ts'
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
    console.log('=== Loading combined configuration ===')
    const config = await getCombinedConfig(supabase)
    console.log('Combined configuration loaded successfully:', {
      chatProvider: config.chatProvider,
      chatModel: config.chatModel,
      chatTemperature: config.chatTemperature,
      chatMaxTokens: config.chatMaxTokens,
      embeddingProvider: config.embeddingProvider,
      embeddingModel: config.embeddingModel,
      similarityThreshold: config.similarityThreshold,
      hasApiKey: !!config.apiKey,
      searchConfigEnabled: !!config.searchConfig,
      factualQuestionThresholds: config.searchConfig.factualQuestionThresholds,
      factualQuestionMatchCount: config.searchConfig.factualQuestionMatchCount
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
    
    // Process document sources for frontend display with enhanced URL processing
    const enhancedSources = vectorSearchResult.relevantDocs.map(doc => {
      const processedUrls = processDocumentUrls(doc.document_url || '')
      
      return {
        title: doc.document_title,
        content: doc.chunk_content.substring(0, 300) + (doc.chunk_content.length > 300 ? '...' : ''),
        viewUrl: processedUrls.viewUrl,
        downloadUrl: processedUrls.downloadUrl,
        isGoogleDrive: processedUrls.isGoogleDrive
      }
    }).filter((source, index, self) => 
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

// Enhanced URL processing function with better Google Drive support
function processDocumentUrls(url: string): {
  viewUrl: string;
  downloadUrl: string;
  isGoogleDrive: boolean;
} {
  if (!url) {
    return {
      viewUrl: '',
      downloadUrl: '',
      isGoogleDrive: false
    };
  }

  const isGoogleDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
  
  if (isGoogleDrive) {
    const fileId = extractGoogleDriveFileId(url);
    
    if (fileId) {
      console.log('Processed Google Drive URL:', { originalUrl: url, fileId });
      return {
        viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        isGoogleDrive: true
      };
    } else {
      console.warn('Could not extract Google Drive file ID from:', url);
      // Fallback to original URL for both view and download
      return {
        viewUrl: url,
        downloadUrl: url,
        isGoogleDrive: true
      };
    }
  }
  
  // For non-Google Drive URLs, use the URL as both view and download
  return {
    viewUrl: url,
    downloadUrl: url,
    isGoogleDrive: false
  };
}

// Enhanced Google Drive file ID extraction with better pattern matching
function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  
  console.log('Extracting file ID from URL:', url);
  
  // Remove any trailing parameters that might interfere
  const cleanUrl = url.split('?')[0].split('#')[0];
  
  // Pattern 1: drive.google.com/file/d/FILE_ID/view or /edit
  const filePattern = /\/file\/d\/([a-zA-Z0-9_-]{25,})/;
  const fileMatch = cleanUrl.match(filePattern);
  if (fileMatch && fileMatch[1]) {
    console.log('Extracted file ID using file pattern:', fileMatch[1]);
    return fileMatch[1];
  }
  
  // Pattern 2: drive.google.com/open?id=FILE_ID
  const openPattern = /[?&]id=([a-zA-Z0-9_-]{25,})/;
  const openMatch = url.match(openPattern);
  if (openMatch && openMatch[1]) {
    console.log('Extracted file ID using open pattern:', openMatch[1]);
    return openMatch[1];
  }
  
  // Pattern 3: docs.google.com/document/d/FILE_ID/edit
  const docsPattern = /\/document\/d\/([a-zA-Z0-9_-]{25,})/;
  const docsMatch = cleanUrl.match(docsPattern);
  if (docsMatch && docsMatch[1]) {
    console.log('Extracted file ID using docs pattern:', docsMatch[1]);
    return docsMatch[1];
  }
  
  // Pattern 4: docs.google.com/spreadsheets/d/FILE_ID
  const sheetsPattern = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{25,})/;
  const sheetsMatch = cleanUrl.match(sheetsPattern);
  if (sheetsMatch && sheetsMatch[1]) {
    console.log('Extracted file ID using sheets pattern:', sheetsMatch[1]);
    return sheetsMatch[1];
  }
  
  // Pattern 5: docs.google.com/presentation/d/FILE_ID
  const slidesPattern = /\/presentation\/d\/([a-zA-Z0-9_-]{25,})/;
  const slidesMatch = cleanUrl.match(slidesPattern);
  if (slidesMatch && slidesMatch[1]) {
    console.log('Extracted file ID using slides pattern:', slidesMatch[1]);
    return slidesMatch[1];
  }
  
  // Fallback: Look for any ID-like string in the URL (be more restrictive)
  const anyIdPattern = /([a-zA-Z0-9_-]{28,})/;
  const anyMatch = cleanUrl.match(anyIdPattern);
  if (anyMatch && anyMatch[1]) {
    console.log('Extracted file ID using fallback pattern:', anyMatch[1]);
    return anyMatch[1];
  }
  
  console.warn('No file ID pattern matched for URL:', url);
  return null;
}
