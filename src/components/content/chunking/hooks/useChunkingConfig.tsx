
import { useState, useEffect } from "react";
import { ChunkingConfig } from "@/types/chunking";
import { supabase } from "@/integrations/supabase/client";

export function useChunkingConfig() {
  // Default chunking configuration
  const [chunkingConfig, setChunkingConfig] = useState<ChunkingConfig>({
    chunkSize: 1000,
    chunkOverlap: 200,
    chunkStrategy: "fixed_size",
  });

  useEffect(() => {
    console.log("useChunkingConfig - Loading configuration");
    loadChunkingConfig();
  }, []);

  const loadChunkingConfig = async () => {
    console.log("useChunkingConfig - Loading chunking configuration");
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('value')
        .eq('key', 'document_processing')
        .maybeSingle();

      if (error) {
        console.error("Error fetching configuration:", error);
        return;
      }

      if (data?.value) {
        const configValue = data.value as any;
        console.log("useChunkingConfig - Found configuration:", configValue);
        
        setChunkingConfig({
          chunkSize: parseInt(configValue.chunkSize) || 1000,
          chunkOverlap: parseInt(configValue.chunkOverlap) || 200,
          chunkStrategy: configValue.chunkStrategy as ChunkingConfig["chunkStrategy"] || "fixed_size",
        });
      } else {
        console.log("useChunkingConfig - No configuration found, using defaults");
      }
    } catch (err) {
      console.error("Error loading chunking configuration:", err);
    }
  };

  const handleChunkingConfigChange = (config: Partial<ChunkingConfig>) => {
    setChunkingConfig(prev => ({
      ...prev,
      ...config
    }));
  };

  return {
    chunkingConfig,
    handleChunkingConfigChange
  };
}
