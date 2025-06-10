
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConfig, DEFAULT_CONFIG } from "./ConfigContext";
import { getProviderFromModel } from "./utils/modelProviders";

export function useConfigLoader(activeTab: string) {
  const { setConfig, setIsLoading } = useConfig();
  const { toast } = useToast();
  // Use state instead of ref for tracking if config has been fetched
  const [configFetched, setConfigFetched] = useState(false);

  // Define fetchConfig function using useCallback to prevent recreating it on every render
  const fetchConfig = useCallback(async () => {
    try {
      console.log("Fetching document processing configuration...");
      setIsLoading(true);
      
      // Fetch document processing settings from database
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .eq('key', 'document_processing')
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching configuration:", error);
        toast({
          variant: "destructive",
          title: "Error loading configuration",
          description: `Failed to load configuration: ${error.message}`
        });
        return;
      }
      
      // If configuration exists, populate the form
      if (data?.value) {
        console.log("Loaded configuration:", data.value);
        const configValue = data.value as any;
        
        // Determine the provider based on the model or specificModelId
        const provider = configValue.provider || getProviderFromModel(configValue.specificModelId || configValue.embeddingModel);
        const specificModelId = configValue.specificModelId || configValue.embeddingModel === provider ? 
          (provider === "openai" ? "text-embedding-ada-002" : "local-model") : configValue.embeddingModel;
        
        setConfig({
          apiKey: configValue.apiKey || DEFAULT_CONFIG.apiKey,
          provider: provider,
          embeddingModel: configValue.embeddingModel || DEFAULT_CONFIG.embeddingModel,
          specificModelId: specificModelId,
          chunkSize: configValue.chunkSize || DEFAULT_CONFIG.chunkSize,
          chunkOverlap: configValue.chunkOverlap || DEFAULT_CONFIG.chunkOverlap,
          chunkStrategy: configValue.chunkStrategy || DEFAULT_CONFIG.chunkStrategy,
          storagePath: configValue.storagePath || DEFAULT_CONFIG.storagePath,
          customConfiguration: configValue.customConfiguration || DEFAULT_CONFIG.customConfiguration,
          providerApiKeys: configValue.providerApiKeys || {},
          // Add missing embedding properties
          embeddingBatchSize: configValue.embeddingBatchSize || DEFAULT_CONFIG.embeddingBatchSize,
          similarityThreshold: configValue.similarityThreshold || DEFAULT_CONFIG.similarityThreshold,
          vectorStorage: configValue.vectorStorage || DEFAULT_CONFIG.vectorStorage,
          embeddingMetadata: configValue.embeddingMetadata || DEFAULT_CONFIG.embeddingMetadata
        });
        
        setConfigFetched(true);
      } else {
        // Reset to default config if nothing is found
        console.log("No configuration found, using defaults");
        setConfig(DEFAULT_CONFIG);
        setConfigFetched(true);
      }
    } catch (err: any) {
      console.error("Error in fetchConfig:", err);
    } finally {
      setIsLoading(false);
    }
  }, [setConfig, setIsLoading, toast]);

  // Load existing configuration when component mounts or activeTab changes to document-processing
  useEffect(() => {
    // Only fetch config for the document-processing tab and when not already fetched
    if (activeTab === "document-processing" && !configFetched) {
      fetchConfig();
    }
    
    // Cleanup function to prevent memory leaks
    return () => {
      // This will ensure we reset our fetch status when the tab changes away from document-processing
      if (activeTab !== "document-processing") {
        setConfigFetched(false);
      }
    };
  }, [activeTab, fetchConfig, configFetched]);
}
