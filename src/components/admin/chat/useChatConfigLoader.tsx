
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChatConfig, DEFAULT_CHAT_CONFIG } from "./ChatConfigContext";
import { Json } from "@/integrations/supabase/types";
import { maskSecretsInObject } from "@/utils/logging";
import { logger } from "@/utils/logger";

export function useChatConfigLoader() {
  const { config, setConfig, setIsLoading, setIsSaving } = useChatConfig();
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info('Loading chat_settings configuration from database');
      
      const { data, error: dbError } = await supabase
        .from("configurations")
        .select("value")
        .eq("key", "chat_settings")
        .maybeSingle();
      
      if (dbError) {
        throw new Error(`Error loading chat configuration: ${dbError.message}`);
      }
      
      if (data?.value && typeof data.value === 'object' && data.value !== null) {
        logger.info('Chat configuration loaded:', maskSecretsInObject(data.value));
        
        // Only extract chat-specific fields
        const dbConfig = data.value as any;
        const chatConfig = {
          chatProvider: dbConfig.chatProvider || DEFAULT_CHAT_CONFIG.chatProvider,
          chatModel: dbConfig.chatModel || DEFAULT_CHAT_CONFIG.chatModel,
          chatTemperature: dbConfig.chatTemperature || DEFAULT_CHAT_CONFIG.chatTemperature,
          chatMaxTokens: dbConfig.chatMaxTokens || DEFAULT_CHAT_CONFIG.chatMaxTokens,
          chatSystemPrompt: dbConfig.chatSystemPrompt || DEFAULT_CHAT_CONFIG.chatSystemPrompt,
          apiKey: dbConfig.apiKey || "",
          chatProviderApiKeys: dbConfig.chatProviderApiKeys || {}
        };
        
        setConfig(chatConfig);
      } else {
        logger.info('No chat configuration found in database, using defaults');
        setConfig(DEFAULT_CHAT_CONFIG);
      }
      
      return data;
    } catch (err: any) {
      logger.error('Error loading chat configuration:', err);
      setError(err.message || 'Failed to load chat configuration');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setConfig, setIsLoading]);
  
  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      logger.info('Saving chat_settings configuration to database:', maskSecretsInObject(config));
      
      // Only save chat-specific fields
      const chatConfigToSave = {
        chatProvider: config.chatProvider,
        chatModel: config.chatModel,
        chatTemperature: config.chatTemperature,
        chatMaxTokens: config.chatMaxTokens,
        chatSystemPrompt: config.chatSystemPrompt,
        apiKey: config.apiKey,
        chatProviderApiKeys: config.chatProviderApiKeys
      };
      
      // Convert to Json-compatible format
      const configAsJson: Json = JSON.parse(JSON.stringify(chatConfigToSave));
      
      // Check if the configuration already exists
      const { data: existingConfig } = await supabase
        .from("configurations")
        .select("key")
        .eq("key", "chat_settings")
        .maybeSingle();
      
      let result;
      if (existingConfig) {
        // Update existing configuration
        result = await supabase
          .from("configurations")
          .update({
            value: configAsJson,
            updated_at: new Date().toISOString()
          })
          .eq("key", "chat_settings");
      } else {
        // Insert new configuration
        result = await supabase
          .from("configurations")
          .insert({
            key: "chat_settings",
            value: configAsJson
          });
      }
      
      if (result.error) {
        throw new Error(`Error saving chat configuration: ${result.error.message}`);
      }
      
      logger.info('Chat configuration saved successfully');
    } catch (err: any) {
      logger.error('Error saving chat configuration:', err);
      setError(err.message || 'Failed to save chat configuration');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [config, setIsSaving]);
  
  return {
    loadConfig,
    saveConfig,
    isLoading: false,
    isSaving: false,
    error
  };
}
