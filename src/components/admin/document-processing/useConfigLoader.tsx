
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConfig, DEFAULT_CONFIG } from "./ConfigContext";

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
          setConfig({
            apiKey: configValue.apiKey || DEFAULT_CONFIG.apiKey,
            embeddingModel: configValue.embeddingModel || DEFAULT_CONFIG.embeddingModel,
            chunkSize: configValue.chunkSize || DEFAULT_CONFIG.chunkSize,
            chunkOverlap: configValue.chunkOverlap || DEFAULT_CONFIG.chunkOverlap,
            chunkStrategy: configValue.chunkStrategy || DEFAULT_CONFIG.chunkStrategy,
            storagePath: configValue.storagePath || DEFAULT_CONFIG.storagePath,
            customConfiguration: configValue.customConfiguration || DEFAULT_CONFIG.customConfiguration,
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
