
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useConfig } from "@/components/admin/document-processing/ConfigContext";
import { supabase } from "@/integrations/supabase/client";

export function useEmbeddingConfig() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loadedConfig, setLoadedConfig] = useState<any>(null);
  const { toast } = useToast();
  const { config } = useConfig();

  // Load configuration from database
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        console.log("Loading configuration from database...");
        
        const { data: configData, error } = await supabase
          .from("configurations")
          .select("key, value")
          .in("key", ["document_processing"]);

        if (error) {
          console.error("Error loading configuration:", error);
          setLoadedConfig(config);
          setConfigLoaded(true);
          return;
        }

        if (configData && configData.length > 0) {
          const dbConfig = configData[0]?.value;
          console.log("Loaded configuration from database:", dbConfig);
          setLoadedConfig(dbConfig);
        } else {
          console.log("No configuration found in database, using context config");
          setLoadedConfig(config);
        }
        setConfigLoaded(true);
      } catch (error) {
        console.error("Error loading configuration:", error);
        setLoadedConfig(config);
        setConfigLoaded(true);
      }
    };

    loadConfiguration();
  }, [config]);

  return {
    isGenerating,
    setIsGenerating,
    configLoaded,
    loadedConfig,
    toast
  };
}
