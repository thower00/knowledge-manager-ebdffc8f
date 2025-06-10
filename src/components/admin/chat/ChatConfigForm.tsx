
import React, { useEffect } from "react";
import { useConfig } from "../document-processing/ConfigContext";
import { ChatModelSelector } from "./ChatModelSelector";
import { ChatParameters } from "./ChatParameters";
import { ChatAPIKeyField } from "./ChatAPIKeyField";
import { getChatModelDefaults } from "../document-processing/utils/chatProviders";
import { Separator } from "@/components/ui/separator";

interface ChatConfigFormProps {
  isLoading: boolean;
}

export function ChatConfigForm({ isLoading }: ChatConfigFormProps) {
  const { config, setConfig } = useConfig();
  
  // Handle provider and model changes
  const handleProviderChange = (provider: string) => {
    console.log(`Changing chat provider to: ${provider}`);
    
    // Get model defaults for the selected provider's default model
    const defaults = getChatModelDefaults(provider, "");
    
    // If there's a saved API key for this provider, use it
    const savedApiKey = config.chatProviderApiKeys[provider] || "";
    
    setConfig(prev => ({
      ...prev,
      chatProvider: provider,
      chatModel: defaults.chatModel,
      chatTemperature: defaults.chatTemperature,
      chatMaxTokens: defaults.chatMaxTokens,
      chatSystemPrompt: defaults.chatSystemPrompt,
      apiKey: savedApiKey, // Set the current API key to the saved one for this provider
    }));
  };
  
  const handleModelChange = (model: string) => {
    console.log(`Changing chat model to: ${model}`);
    
    // Get the default settings for the selected model
    const defaults = getChatModelDefaults(config.chatProvider, model);
    
    setConfig(prev => ({
      ...prev,
      chatModel: model,
      chatTemperature: defaults.chatTemperature,
      chatMaxTokens: defaults.chatMaxTokens,
      chatSystemPrompt: defaults.chatSystemPrompt
    }));
  };
  
  // Save API key to provider-specific storage when it changes
  useEffect(() => {
    if (config.chatProvider && config.apiKey) {
      setConfig(prev => ({
        ...prev,
        chatProviderApiKeys: {
          ...prev.chatProviderApiKeys,
          [config.chatProvider]: config.apiKey
        }
      }));
    }
  }, [config.chatProvider, config.apiKey, setConfig]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4">Chat Provider & Model</h3>
        
        <div className="space-y-6">
          <ChatModelSelector 
            isLoading={isLoading} 
            onProviderChange={handleProviderChange}
            onModelChange={handleModelChange}
          />
          
          <ChatAPIKeyField isLoading={isLoading} />
        </div>
      </div>

      <div className="pt-2">
        <h3 className="text-lg font-medium mb-4">Chat Parameters</h3>
        
        <ChatParameters isLoading={isLoading} />
      </div>
      
      <Separator className="my-6" />
      
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> This configuration will be used by the AI Chat component to generate responses to user queries based on your document embeddings.
          Ensure that your API keys are valid and have sufficient credits.
        </p>
      </div>
    </div>
  );
}
