
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConfig, DEFAULT_CONFIG } from "./ConfigContext";
import { getProviderFromModel } from "./utils/modelProviders";

export function useConfigLoader(activeTab: string) {
  const { setConfig, setIsLoading } = useConfig();
  const { toast } = useToast();
  // Create a local ref that doesn't persist between renders
  const configFetched = useRef(false);

  // Load existing configuration when component mounts or activeTab changes to document-processing
  useEffect(() => {
    // Move this inside the effect to prevent invalid hook calls
    const isMounted = useRef(true);
    
    async function fetchConfig() {
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
          if (isMounted.current) {
            toast({
              variant: "destructive",
              title: "Error loading configuration",
              description: `Failed to load configuration: ${error.message}`
            });
          }
          return;
        }
        
        // If configuration exists, populate the form
        if (data?.value && isMounted.current) {
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
            providerApiKeys: configValue.providerApiKeys || {}
          });
          
          configFetched.current = true;
        } else if (isMounted.current) {
          // Reset to default config if nothing is found
          console.log("No configuration found, using defaults");
          setConfig(DEFAULT_CONFIG);
          configFetched.current = true;
        }
      } catch (err: any) {
        console.error("Error in fetchConfig:", err);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }
    
    // Only fetch config for the document-processing tab and when not already fetched
    if (activeTab === "document-processing" && !configFetched.current) {
      fetchConfig();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [activeTab, toast, setConfig, setIsLoading]);

  // Reset fetch flag when component unmounts
  useEffect(() => {
    return () => {
      configFetched.current = false;
    };
  }, []);
}
