
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
  
  // Load configuration from database
  const { data: configData, error: configError } = await supabase
    .from('configuration')
    .select('*')
    .single()

  if (configError) {
    console.error('Error loading configuration:', configError)
    throw new Error('Failed to load configuration from database')
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
    apiKey: configData.openai_api_key || ''
  }
}
