
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { ChatConfig } from './types.ts'

export async function loadConfiguration(supabase: any): Promise<ChatConfig> {
  // Load chat configuration from database
  const { data: chatConfigData, error: chatConfigError } = await supabase
    .from('configurations')
    .select('value')
    .eq('key', 'chat_settings')
    .maybeSingle()
    
  if (chatConfigError) {
    console.error('Error loading chat config:', chatConfigError)
    throw new Error('Error loading chat configuration')
  }
    
  if (!chatConfigData?.value) {
    console.error('Chat configuration not found')
    throw new Error('Chat configuration not found. Please configure your AI provider in the admin settings.')
  }

  // Load document processing configuration for embedding settings
  const { data: embeddingConfigData, error: embeddingConfigError } = await supabase
    .from('configurations')
    .select('value')
    .eq('key', 'document_processing')
    .maybeSingle()

  if (embeddingConfigError) {
    console.error('Error loading embedding config:', embeddingConfigError)
    throw new Error('Error loading embedding configuration')
  }
  
  const chatConfig = chatConfigData.value as any
  const embeddingConfig = embeddingConfigData?.value || {}
  
  // Merge configurations
  const config: ChatConfig = {
    ...chatConfig,
    // Use embedding config for vector search
    provider: embeddingConfig.provider || 'openai',
    embeddingModel: embeddingConfig.specificModelId || 'text-embedding-ada-002',
    similarityThreshold: embeddingConfig.similarityThreshold || '0.7',
    embeddingBatchSize: embeddingConfig.embeddingBatchSize || '10'
  }
  
  console.log('Config loaded:', { 
    provider: config.chatProvider, 
    model: config.chatModel,
    temperature: config.chatTemperature,
    maxTokens: config.chatMaxTokens,
    embeddingProvider: config.provider,
    embeddingModel: config.embeddingModel,
    similarityThreshold: config.similarityThreshold
  })
  
  if (!config.apiKey) {
    console.error('API key not configured')
    throw new Error('API key not configured for chat provider. Please add your API key in the admin settings.')
  }

  return config
}
