

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface ChatConfig {
  chatProvider: string
  chatModel: string
  chatTemperature: string
  chatMaxTokens: string
  chatSystemPrompt: string
  embeddingProvider: string
  embeddingModel: string
  similarityThreshold: string
  apiKey: string
}

export async function getChatConfig(supabase: any): Promise<ChatConfig> {
  console.log('Loading chat configuration from database...')
  
  // Load configuration from database - using correct table name 'configurations' (plural)
  const { data: configData, error: configError } = await supabase
    .from('configurations')
    .select('*')
    .single()

  if (configError) {
    console.error('Error loading configuration:', configError)
    console.log('Falling back to default configuration...')
    
    // Return default configuration if database config is not available
    return {
      chatProvider: 'openai',
      chatModel: 'gpt-4o-mini',
      chatTemperature: '0.7',
      chatMaxTokens: '2000',
      chatSystemPrompt: 'You are a helpful assistant.',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      similarityThreshold: '0.7',
      apiKey: Deno.env.get('OPENAI_API_KEY') || ''
    }
  }

  console.log('Configuration loaded successfully:', {
    chatProvider: configData.chat_provider,
    chatModel: configData.chat_model,
    embeddingProvider: configData.embedding_provider,
    embeddingModel: configData.embedding_model
  })

  return {
    chatProvider: configData.chat_provider || 'openai',
    chatModel: configData.chat_model || 'gpt-4o-mini',
    chatTemperature: configData.chat_temperature?.toString() || '0.7',
    chatMaxTokens: configData.chat_max_tokens?.toString() || '2000',
    chatSystemPrompt: configData.chat_system_prompt || 'You are a helpful assistant.',
    embeddingProvider: configData.embedding_provider || 'openai',
    embeddingModel: configData.embedding_model || 'text-embedding-3-small',
    similarityThreshold: configData.similarity_threshold?.toString() || '0.7',
    apiKey: configData.openai_api_key || Deno.env.get('OPENAI_API_KEY') || ''
  }
}

