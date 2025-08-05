
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface SearchConfig {
  // Similarity Thresholds
  factualQuestionThresholds: number[]
  summaryRequestThresholds: number[]
  standardThresholds: number[]
  
  // Match Count (Number of chunks)
  factualQuestionMatchCount: number
  summaryMatchCount: number
  extensiveSummaryMatchCount: number
  standardMatchCount: number
  
  // Content Length (Character limits)
  factualQuestionContentLength: number
  summaryContentLength: number
  extensiveSummaryContentLength: number
  standardContentLength: number
  
  // Processing Limits
  factualQuestionChunksPerDocument: number
  summaryChunksPerDocument: number
  extensiveSummaryChunksPerDocument: number
  standardChunksPerDocument: number
  
  factualQuestionTotalChunksLimit: number
  summaryTotalChunksLimit: number
  extensiveSummaryTotalChunksLimit: number
  standardTotalChunksLimit: number
  
  // Additional search parameters
  enhancedContentSearchLimit: number
  titleSearchMinWordLength: number
  contentSearchBatchSize: number
}

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

export interface CombinedConfig extends ChatConfig {
  searchConfig: SearchConfig
}

export async function getCombinedConfig(supabase: any): Promise<CombinedConfig> {
  console.log('Loading combined configuration from database...')
  
  // Load chat-specific configuration from database - using key 'chat_settings'
  const { data: configData, error: configError } = await supabase
    .from('configurations')
    .select('value')
    .eq('key', 'chat_settings')
    .maybeSingle()

  // Load search-specific configuration from database - using key 'search_settings'
  const { data: searchData, error: searchError } = await supabase
    .from('configurations')
    .select('value')
    .eq('key', 'search_settings')
    .maybeSingle()

  // Create search config with defaults
  const searchConfig = getSearchConfigWithDefaults(searchData, searchError)
  
  if (configError) {
    console.error('Error loading chat configuration:', configError)
    console.log('Falling back to default chat configuration...')
    
    // Return default configuration with improved system prompt
    return {
      chatProvider: 'openai',
      chatModel: 'gpt-4o-mini',
      chatTemperature: '0.7',
      chatMaxTokens: '2000',
      chatSystemPrompt: 'You are a helpful assistant that answers questions based on provided document content. When referencing documents, use the document titles naturally in your response text, but do NOT create a separate "Sources:" section at the end - the system will automatically display document sources separately.',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      similarityThreshold: '0.7',
      apiKey: Deno.env.get('OPENAI_API_KEY') || '',
      searchConfig
    }
  }

  // If no chat configuration exists yet, return defaults with improved system prompt
  if (!configData?.value) {
    console.log('No chat configuration found, using defaults...')
    return {
      chatProvider: 'openai',
      chatModel: 'gpt-4o-mini',
      chatTemperature: '0.7',
      chatMaxTokens: '2000',
      chatSystemPrompt: 'You are a helpful assistant that answers questions based on provided document content. When referencing documents, use the document titles naturally in your response text, but do NOT create a separate "Sources:" section at the end - the system will automatically display document sources separately.',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      similarityThreshold: '0.7',
      apiKey: Deno.env.get('OPENAI_API_KEY') || '',
      searchConfig
    }
  }

  const chatConfig = configData.value as any;
  
  console.log('Combined configuration loaded successfully:', {
    chatProvider: chatConfig.chatProvider,
    chatModel: chatConfig.chatModel,
    embeddingProvider: chatConfig.embeddingProvider,
    embeddingModel: chatConfig.embeddingModel,
    searchConfigLoaded: !!searchConfig
  })

  // Ensure the system prompt prevents duplicate sources
  const systemPrompt = chatConfig.chatSystemPrompt || 'You are a helpful assistant that answers questions based on provided document content. When referencing documents, use the document titles naturally in your response text, but do NOT create a separate "Sources:" section at the end - the system will automatically display document sources separately.'

  return {
    chatProvider: chatConfig.chatProvider || 'openai',
    chatModel: chatConfig.chatModel || 'gpt-4o-mini',
    chatTemperature: chatConfig.chatTemperature?.toString() || '0.7',
    chatMaxTokens: chatConfig.chatMaxTokens?.toString() || '2000',
    chatSystemPrompt: systemPrompt,
    embeddingProvider: chatConfig.embeddingProvider || 'openai',
    embeddingModel: chatConfig.embeddingModel || 'text-embedding-3-small',
    similarityThreshold: chatConfig.similarityThreshold?.toString() || '0.7',
    apiKey: chatConfig.apiKey || Deno.env.get('OPENAI_API_KEY') || '',
    searchConfig
  }
}

function getSearchConfigWithDefaults(searchData: any, searchError: any): SearchConfig {
  // Default search configuration matching the SearchConfigContext
  const defaultSearchConfig: SearchConfig = {
    // Similarity Thresholds
    factualQuestionThresholds: [0.03, 0.1, 0.2, 0.3, 0.4],
    summaryRequestThresholds: [0.1, 0.2, 0.3, 0.4, 0.5],
    standardThresholds: [0.15, 0.25, 0.35, 0.45],
    
    // Match Count
    factualQuestionMatchCount: 50,
    summaryMatchCount: 25,
    extensiveSummaryMatchCount: 30,
    standardMatchCount: 15,
    
    // Content Length
    factualQuestionContentLength: 6000,
    summaryContentLength: 1800,
    extensiveSummaryContentLength: 2500,
    standardContentLength: 1500,
    
    // Processing Limits
    factualQuestionChunksPerDocument: 18,
    summaryChunksPerDocument: 5,
    extensiveSummaryChunksPerDocument: 8,
    standardChunksPerDocument: 4,
    
    factualQuestionTotalChunksLimit: 45,
    summaryTotalChunksLimit: 15,
    extensiveSummaryTotalChunksLimit: 20,
    standardTotalChunksLimit: 12,
    
    // Additional parameters
    enhancedContentSearchLimit: 12,
    titleSearchMinWordLength: 2,
    contentSearchBatchSize: 4
  }

  if (searchError) {
    console.error('Error loading search configuration:', searchError)
    console.log('Falling back to default search configuration...')
    return defaultSearchConfig
  }

  if (!searchData?.value) {
    console.log('No search configuration found, using defaults...')
    return defaultSearchConfig
  }

  const searchConfig = searchData.value as any
  console.log('Search configuration loaded from database')

  return {
    // Use configured values or fallback to defaults
    factualQuestionThresholds: searchConfig.factualQuestionThresholds || defaultSearchConfig.factualQuestionThresholds,
    summaryRequestThresholds: searchConfig.summaryRequestThresholds || defaultSearchConfig.summaryRequestThresholds,
    standardThresholds: searchConfig.standardThresholds || defaultSearchConfig.standardThresholds,
    
    factualQuestionMatchCount: searchConfig.factualQuestionMatchCount || defaultSearchConfig.factualQuestionMatchCount,
    summaryMatchCount: searchConfig.summaryMatchCount || defaultSearchConfig.summaryMatchCount,
    extensiveSummaryMatchCount: searchConfig.extensiveSummaryMatchCount || defaultSearchConfig.extensiveSummaryMatchCount,
    standardMatchCount: searchConfig.standardMatchCount || defaultSearchConfig.standardMatchCount,
    
    factualQuestionContentLength: searchConfig.factualQuestionContentLength || defaultSearchConfig.factualQuestionContentLength,
    summaryContentLength: searchConfig.summaryContentLength || defaultSearchConfig.summaryContentLength,
    extensiveSummaryContentLength: searchConfig.extensiveSummaryContentLength || defaultSearchConfig.extensiveSummaryContentLength,
    standardContentLength: searchConfig.standardContentLength || defaultSearchConfig.standardContentLength,
    
    factualQuestionChunksPerDocument: searchConfig.factualQuestionChunksPerDocument || defaultSearchConfig.factualQuestionChunksPerDocument,
    summaryChunksPerDocument: searchConfig.summaryChunksPerDocument || defaultSearchConfig.summaryChunksPerDocument,
    extensiveSummaryChunksPerDocument: searchConfig.extensiveSummaryChunksPerDocument || defaultSearchConfig.extensiveSummaryChunksPerDocument,
    standardChunksPerDocument: searchConfig.standardChunksPerDocument || defaultSearchConfig.standardChunksPerDocument,
    
    factualQuestionTotalChunksLimit: searchConfig.factualQuestionTotalChunksLimit || defaultSearchConfig.factualQuestionTotalChunksLimit,
    summaryTotalChunksLimit: searchConfig.summaryTotalChunksLimit || defaultSearchConfig.summaryTotalChunksLimit,
    extensiveSummaryTotalChunksLimit: searchConfig.extensiveSummaryTotalChunksLimit || defaultSearchConfig.extensiveSummaryTotalChunksLimit,
    standardTotalChunksLimit: searchConfig.standardTotalChunksLimit || defaultSearchConfig.standardTotalChunksLimit,
    
    enhancedContentSearchLimit: searchConfig.enhancedContentSearchLimit || defaultSearchConfig.enhancedContentSearchLimit,
    titleSearchMinWordLength: searchConfig.titleSearchMinWordLength || defaultSearchConfig.titleSearchMinWordLength,
    contentSearchBatchSize: searchConfig.contentSearchBatchSize || defaultSearchConfig.contentSearchBatchSize
  }
}
