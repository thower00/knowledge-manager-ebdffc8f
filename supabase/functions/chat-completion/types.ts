
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  sessionId: string
  messages: ChatMessage[]
  question: string
}

export interface ChatConfig {
  chatProvider: string
  chatModel: string
  apiKey: string
  chatTemperature: string
  chatMaxTokens: string
  chatSystemPrompt: string
  // Add embedding configuration for vector search
  provider: string
  embeddingModel: string
  similarityThreshold: string
  embeddingBatchSize: string
}

export interface ContextSource {
  document_title: string
  chunk_content: string
  similarity?: number
  document_url?: string
  document_id?: string
}
