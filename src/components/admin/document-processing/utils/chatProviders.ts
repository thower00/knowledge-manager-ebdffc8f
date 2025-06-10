
export interface ChatModelOption {
  id: string;
  name: string;
  description?: string;
  contextWindow?: string;
  defaultTemperature: string;
  defaultMaxTokens: string;
  capabilities: string[];
  defaultSystemPrompt?: string;
}

export interface ChatProviderConfig {
  name: string;
  apiKeyName: string;
  apiKeyPlaceholder: string;
  apiKeyDescription: string;
  verificationEndpoint: string;
  defaultModel: string;
  models: ChatModelOption[];
}

export const CHAT_PROVIDERS: Record<string, ChatProviderConfig> = {
  openai: {
    name: "OpenAI",
    apiKeyName: "OPENAI_API_KEY",
    apiKeyPlaceholder: "Enter your OpenAI API key",
    apiKeyDescription: "API key for OpenAI chat models",
    verificationEndpoint: "/functions/v1/verify-openai-key",
    defaultModel: "gpt-4o-mini",
    models: [
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "Smaller, faster version of GPT-4o with good cost-performance balance",
        contextWindow: "128K tokens",
        defaultTemperature: "0.7",
        defaultMaxTokens: "2000",
        capabilities: ["Text generation", "Code generation", "Reasoning", "Vision"],
        defaultSystemPrompt: "You are a helpful assistant answering questions based on the provided context."
      },
      {
        id: "gpt-4o",
        name: "GPT-4o",
        description: "Most powerful GPT model with vision capabilities",
        contextWindow: "128K tokens",
        defaultTemperature: "0.7",
        defaultMaxTokens: "2000",
        capabilities: ["Text generation", "Code generation", "Reasoning", "Vision"],
        defaultSystemPrompt: "You are a helpful assistant answering questions based on the provided context."
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Fast and cost-effective for less complex tasks",
        contextWindow: "16K tokens",
        defaultTemperature: "0.7",
        defaultMaxTokens: "1000",
        capabilities: ["Text generation", "Basic reasoning", "Basic code generation"],
        defaultSystemPrompt: "You are a helpful assistant answering questions based on the provided context."
      }
    ]
  },
  anthropic: {
    name: "Anthropic",
    apiKeyName: "ANTHROPIC_API_KEY",
    apiKeyPlaceholder: "Enter your Anthropic API key",
    apiKeyDescription: "API key for Anthropic Claude models",
    verificationEndpoint: "/functions/v1/verify-anthropic-key", 
    defaultModel: "claude-3-haiku-20240307",
    models: [
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        description: "Most powerful Claude model with exceptional reasoning",
        contextWindow: "200K tokens",
        defaultTemperature: "0.5",
        defaultMaxTokens: "4000",
        capabilities: ["Text generation", "Code generation", "Advanced reasoning", "Vision"],
        defaultSystemPrompt: "You are Claude, a helpful AI assistant created by Anthropic to be helpful, harmless, and honest."
      },
      {
        id: "claude-3-sonnet-20240229",
        name: "Claude 3 Sonnet",
        description: "Balanced performance and speed for most tasks",
        contextWindow: "200K tokens",
        defaultTemperature: "0.5",
        defaultMaxTokens: "4000",
        capabilities: ["Text generation", "Code generation", "Reasoning", "Vision"],
        defaultSystemPrompt: "You are Claude, a helpful AI assistant created by Anthropic to be helpful, harmless, and honest."
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        description: "Fast and efficient for simpler tasks",
        contextWindow: "200K tokens",
        defaultTemperature: "0.5",
        defaultMaxTokens: "2000",
        capabilities: ["Text generation", "Basic reasoning", "Vision"],
        defaultSystemPrompt: "You are Claude, a helpful AI assistant created by Anthropic to be helpful, harmless, and honest."
      }
    ]
  },
  cohere: {
    name: "Cohere",
    apiKeyName: "COHERE_API_KEY",
    apiKeyPlaceholder: "Enter your Cohere API key",
    apiKeyDescription: "API key for Cohere Command models",
    verificationEndpoint: "/functions/v1/verify-cohere-key",
    defaultModel: "command",
    models: [
      {
        id: "command",
        name: "Command",
        description: "General purpose model for text generation and tasks",
        contextWindow: "4K tokens",
        defaultTemperature: "0.7",
        defaultMaxTokens: "1000",
        capabilities: ["Text generation", "Basic code generation"],
        defaultSystemPrompt: "You are a helpful assistant answering questions based on the provided context."
      },
      {
        id: "command-light",
        name: "Command Light",
        description: "Faster and lighter version for simple tasks",
        contextWindow: "4K tokens",
        defaultTemperature: "0.7",
        defaultMaxTokens: "800",
        capabilities: ["Text generation", "Basic reasoning"],
        defaultSystemPrompt: "You are a helpful assistant answering questions based on the provided context."
      },
      {
        id: "command-r",
        name: "Command R",
        description: "Advanced reasoning capabilities for complex queries",
        contextWindow: "128K tokens",
        defaultTemperature: "0.7",
        defaultMaxTokens: "2000",
        capabilities: ["Text generation", "Advanced reasoning", "Code generation"],
        defaultSystemPrompt: "You are a helpful assistant answering questions based on the provided context."
      }
    ]
  }
};

export function getChatProviderFromModel(modelId: string): string {
  for (const [provider, config] of Object.entries(CHAT_PROVIDERS)) {
    if (config.models.some(model => model.id === modelId)) {
      return provider;
    }
  }
  return "openai"; // Default provider
}

export function getChatModelDefaults(providerId: string, modelId: string): {
  chatModel: string;
  chatTemperature: string;
  chatMaxTokens: string;
  chatSystemPrompt: string;
} {
  const provider = CHAT_PROVIDERS[providerId];
  if (!provider) {
    return {
      chatModel: "gpt-4o-mini",
      chatTemperature: "0.7",
      chatMaxTokens: "2000",
      chatSystemPrompt: "You are a helpful assistant answering questions based on the provided context."
    };
  }
  
  // If no modelId is specified, use the default model from the provider
  if (!modelId) {
    const defaultModel = provider.models.find(m => m.id === provider.defaultModel) || provider.models[0];
    return {
      chatModel: defaultModel.id,
      chatTemperature: defaultModel.defaultTemperature,
      chatMaxTokens: defaultModel.defaultMaxTokens,
      chatSystemPrompt: defaultModel.defaultSystemPrompt || "You are a helpful assistant answering questions based on the provided context."
    };
  }
  
  const model = provider.models.find(m => m.id === modelId);
  if (!model) {
    // If model not found, use the provider's default
    const defaultModel = provider.models.find(m => m.id === provider.defaultModel) || provider.models[0];
    return {
      chatModel: defaultModel.id,
      chatTemperature: defaultModel.defaultTemperature,
      chatMaxTokens: defaultModel.defaultMaxTokens,
      chatSystemPrompt: defaultModel.defaultSystemPrompt || "You are a helpful assistant answering questions based on the provided context."
    };
  }
  
  return {
    chatModel: model.id,
    chatTemperature: model.defaultTemperature,
    chatMaxTokens: model.defaultMaxTokens,
    chatSystemPrompt: model.defaultSystemPrompt || "You are a helpful assistant answering questions based on the provided context."
  };
}
