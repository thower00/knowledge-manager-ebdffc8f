
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConfig, DEFAULT_CONFIG } from "./ConfigContext";
import { getProviderFromModel } from "./utils/modelProviders";

export function useConfigLoader(activeTab: string) {
  const { setConfig, setIsLoading } = useConfig();
  const { toast } = useToast();

  // Load existing configuration when component mounts
  useEffect(() => {
    async function fetchConfig() {
      try {
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
        }
      } catch (err: any) {
        console.error("Error in fetchConfig:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (activeTab === "document-processing") {
      fetchConfig();
    }
  }, [activeTab, toast, setConfig, setIsLoading]);
}
