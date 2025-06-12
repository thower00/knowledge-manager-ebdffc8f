

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
  
  // Load chat-specific configuration from database - using key 'chat_settings'
  const { data: configData, error: configError } = await supabase
    .from('configurations')
    .select('value')
    .eq('key', 'chat_settings')
    .maybeSingle()

  if (configError) {
    console.error('Error loading chat configuration:', configError)
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

  // If no chat configuration exists yet, return defaults
  if (!configData?.value) {
    console.log('No chat configuration found, using defaults...')
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

  const chatConfig = configData.value as any;
  
  console.log('Chat configuration loaded successfully:', {
    chatProvider: chatConfig.chatProvider,
    chatModel: chatConfig.chatModel,
    embeddingProvider: chatConfig.embeddingProvider,
    embeddingModel: chatConfig.embeddingModel
  })

  return {
    chatProvider: chatConfig.chatProvider || 'openai',
    chatModel: chatConfig.chatModel || 'gpt-4o-mini',
    chatTemperature: chatConfig.chatTemperature?.toString() || '0.7',
    chatMaxTokens: chatConfig.chatMaxTokens?.toString() || '2000',
    chatSystemPrompt: chatConfig.chatSystemPrompt || 'You are a helpful assistant.',
    embeddingProvider: chatConfig.embeddingProvider || 'openai',
    embeddingModel: chatConfig.embeddingModel || 'text-embedding-3-small',
    similarityThreshold: chatConfig.similarityThreshold?.toString() || '0.7',
    apiKey: chatConfig.apiKey || Deno.env.get('OPENAI_API_KEY') || ''
  }
}
