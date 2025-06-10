import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { useConfig, DEFAULT_CONFIG } from "./ConfigContext";
import { getProviderFromModel } from "./utils/modelProviders";

export function ConfigActions() {
  const { config, setConfig, isLoading, isSaving, setIsSaving } = useConfig();
  const { toast } = useToast();

  const handleReset = async () => {
    try {
      // Fetch default configuration
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .eq('key', 'document_processing')
        .maybeSingle();
        
      if (error) {
        throw new Error(error.message);
      }
      
      // If configuration exists, populate the form with its values
      if (data?.value) {
        const configValue = data.value as any;
        const provider = configValue.provider || getProviderFromModel(configValue.specificModelId || configValue.embeddingModel);
        
        setConfig({
          apiKey: configValue.apiKey || "",
          provider: provider,
          embeddingModel: configValue.embeddingModel || "openai",
          specificModelId: configValue.specificModelId || "text-embedding-ada-002",
          chunkSize: configValue.chunkSize || "1000",
          chunkOverlap: configValue.chunkOverlap || "200",
          chunkStrategy: configValue.chunkStrategy || "fixed_size",
          storagePath: configValue.storagePath || "/data/documents",
          customConfiguration: configValue.customConfiguration || "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
          providerApiKeys: configValue.providerApiKeys || {},
          // Add missing embedding properties
          embeddingBatchSize: configValue.embeddingBatchSize || DEFAULT_CONFIG.embeddingBatchSize,
          similarityThreshold: configValue.similarityThreshold || DEFAULT_CONFIG.similarityThreshold,
          vectorStorage: configValue.vectorStorage || DEFAULT_CONFIG.vectorStorage,
          embeddingMetadata: configValue.embeddingMetadata || DEFAULT_CONFIG.embeddingMetadata
        });
        
        toast({
          title: "Configuration reset",
          description: "Settings have been reset to their saved values",
        });
      } else {
        // Reset to default values if no configuration exists
        setConfig(DEFAULT_CONFIG);
        
        toast({
          title: "Configuration reset",
          description: "Settings have been reset to default values",
        });
      }
    } catch (error: any) {
      console.error("Error resetting configuration:", error);
      toast({
        variant: "destructive",
        title: "Error resetting configuration",
        description: `There was a problem resetting your configuration: ${error.message || "Unknown error"}`,
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Validate JSON format for customConfiguration
      try {
        JSON.parse(config.customConfiguration);
      } catch (jsonError) {
        toast({
          variant: "destructive",
          title: "Invalid JSON",
          description: "Custom configuration contains invalid JSON",
        });
        setIsSaving(false);
        return;
      }
      
      console.log("Saving document processing settings:", config);
      
      // Check if configuration already exists
      const { data: existingConfig, error: fetchError } = await supabase
        .from('configurations')
        .select('*')
        .eq('key', 'document_processing')
        .maybeSingle();
      
      if (fetchError) {
        console.error("Error checking existing configuration:", fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }
      
      // Update the provider API keys if the current API key is set
      const updatedConfig = {...config};
      if (config.apiKey && config.provider) {
        updatedConfig.providerApiKeys = {
          ...config.providerApiKeys,
          [config.provider]: config.apiKey
        };
      }
      
      let result;
      
      if (existingConfig) {
        // Update existing configuration - Convert config to a plain object for Json compatibility
        result = await supabase
          .from('configurations')
          .update({
            value: updatedConfig as unknown as Json,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'document_processing');
      } else {
        // Insert new configuration - Convert config to a plain object for Json compatibility
        result = await supabase
          .from('configurations')
          .insert({
            key: 'document_processing',
            value: updatedConfig as unknown as Json,
            description: 'Document processing configuration'
          });
      }
      
      if (result.error) {
        throw new Error(`Save failed: ${result.error.message}`);
      }
      
      toast({
        title: "Document Processing settings saved",
        description: "Your configuration has been saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving configuration:", error);
      toast({
        variant: "destructive",
        title: "Error saving configuration",
        description: `There was a problem saving your configuration: ${error.message || "Unknown error"}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex justify-between">
      <Button 
        variant="outline" 
        onClick={handleReset}
        disabled={isLoading || isSaving}
      >
        Reset
      </Button>
      <Button 
        onClick={handleSave} 
        disabled={isLoading || isSaving}
      >
        {isSaving ? "Saving..." : "Save Configuration"}
      </Button>
    </div>
  );
}
