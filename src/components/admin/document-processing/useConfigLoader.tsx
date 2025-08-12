
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfig, DEFAULT_CONFIG } from "./ConfigContext";
import { Json } from "@/integrations/supabase/types";
import { logger } from "@/utils/logger";
export function useConfigLoader(configKey: string = "document_processing") {
  const { config, setConfig, setIsLoading, setIsSaving } = useConfig();
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info(`Loading ${configKey} configuration from database`);
      
      const { data, error: dbError } = await supabase
        .from("configurations")
        .select("value")
        .eq("key", configKey)
        .maybeSingle();
      
      if (dbError) {
        throw new Error(`Error loading configuration: ${dbError.message}`);
      }
      
      if (data?.value && typeof data.value === 'object' && data.value !== null) {
        logger.info(`${configKey} configuration loaded:`, data.value);
        
        // Only extract document processing specific fields
        const dbConfig = data.value as any;
        const docConfig = {
          apiKey: dbConfig.apiKey || "",
          provider: dbConfig.provider || DEFAULT_CONFIG.provider,
          embeddingModel: dbConfig.embeddingModel || DEFAULT_CONFIG.embeddingModel,
          specificModelId: dbConfig.specificModelId || DEFAULT_CONFIG.specificModelId,
          chunkSize: dbConfig.chunkSize || DEFAULT_CONFIG.chunkSize,
          chunkOverlap: dbConfig.chunkOverlap || DEFAULT_CONFIG.chunkOverlap,
          chunkStrategy: dbConfig.chunkStrategy || DEFAULT_CONFIG.chunkStrategy,
          storagePath: dbConfig.storagePath || DEFAULT_CONFIG.storagePath,
          customConfiguration: dbConfig.customConfiguration || DEFAULT_CONFIG.customConfiguration,
          providerApiKeys: dbConfig.providerApiKeys || {},
          embeddingBatchSize: dbConfig.embeddingBatchSize || DEFAULT_CONFIG.embeddingBatchSize,
          similarityThreshold: dbConfig.similarityThreshold || DEFAULT_CONFIG.similarityThreshold,
          vectorStorage: dbConfig.vectorStorage || DEFAULT_CONFIG.vectorStorage,
          embeddingMetadata: dbConfig.embeddingMetadata || DEFAULT_CONFIG.embeddingMetadata
        };
        
        setConfig(docConfig);
      } else {
        logger.info(`No ${configKey} configuration found in database, using defaults`);
      }
      
      return data;
    } catch (err: any) {
      logger.error(`Error loading ${configKey} configuration:`, err);
      setError(err.message || `Failed to load ${configKey} configuration`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [configKey, setConfig, setIsLoading]);
  
  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      logger.info(`Saving ${configKey} configuration to database:`, config);
      
      // Only save document processing specific fields
      const docConfigToSave = {
        apiKey: config.apiKey,
        provider: config.provider,
        embeddingModel: config.embeddingModel,
        specificModelId: config.specificModelId,
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
        chunkStrategy: config.chunkStrategy,
        storagePath: config.storagePath,
        customConfiguration: config.customConfiguration,
        providerApiKeys: config.providerApiKeys,
        embeddingBatchSize: config.embeddingBatchSize,
        similarityThreshold: config.similarityThreshold,
        vectorStorage: config.vectorStorage,
        embeddingMetadata: config.embeddingMetadata
      };
      
      // Convert to Json-compatible format
      const configAsJson: Json = JSON.parse(JSON.stringify(docConfigToSave));
      
      // First check if the configuration already exists
      const { data: existingConfig } = await supabase
        .from("configurations")
        .select("key")
        .eq("key", configKey)
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
          .eq("key", configKey);
      } else {
        // Insert new configuration
        result = await supabase
          .from("configurations")
          .insert({
            key: configKey,
            value: configAsJson
          });
      }
      
      if (result.error) {
        throw new Error(`Error saving configuration: ${result.error.message}`);
      }
      
      logger.info(`${configKey} configuration saved successfully`);
    } catch (err: any) {
      logger.error(`Error saving ${configKey} configuration:`, err);
      setError(err.message || `Failed to save ${configKey} configuration`);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [config, configKey, setIsSaving]);
  
  return {
    loadConfig,
    saveConfig,
    isLoading: false,
    isSaving: false,
    error
  };
}
