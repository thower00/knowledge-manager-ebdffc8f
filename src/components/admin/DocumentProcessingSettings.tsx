
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { OpenAIKeyField } from "./document-processing/OpenAIKeyField";
import { ModelSelector } from "./document-processing/ModelSelector";
import { ChunkSettings } from "./document-processing/ChunkSettings";
import { StoragePathField } from "./document-processing/StoragePathField";
import { CustomConfigField } from "./document-processing/CustomConfigField";

// Define the ConfigSettings interface with an index signature to make it compatible with Json type
interface ConfigSettings {
  apiKey: string;
  embeddingModel: string;
  chunkSize: string;
  chunkOverlap: string;
  storagePath: string;
  customConfiguration: string;
  [key: string]: string; // Add index signature to make it compatible with { [key: string]: Json }
}

export function DocumentProcessingSettings({ activeTab }: { activeTab: string }) {
  const [config, setConfig] = useState<ConfigSettings>({
    apiKey: "",
    embeddingModel: "openai",
    chunkSize: "1000",
    chunkOverlap: "200",
    storagePath: "/data/documents",
    customConfiguration: "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
            apiKey: configValue.apiKey || "",
            embeddingModel: configValue.embeddingModel || "openai",
            chunkSize: configValue.chunkSize || "1000",
            chunkOverlap: configValue.chunkOverlap || "200",
            storagePath: configValue.storagePath || "/data/documents",
            customConfiguration: configValue.customConfiguration || "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
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
  }, [activeTab, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setConfig({ ...config, [name]: value });
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
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
        setConfig({
          apiKey: configValue.apiKey || "",
          embeddingModel: configValue.embeddingModel || "openai",
          chunkSize: configValue.chunkSize || "1000",
          chunkOverlap: configValue.chunkOverlap || "200",
          storagePath: configValue.storagePath || "/data/documents",
          customConfiguration: configValue.customConfiguration || "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
        });
        
        toast({
          title: "Configuration reset",
          description: "Settings have been reset to their saved values",
        });
      } else {
        // Reset to default values if no configuration exists
        setConfig({
          apiKey: "",
          embeddingModel: "openai",
          chunkSize: "1000",
          chunkOverlap: "200",
          storagePath: "/data/documents",
          customConfiguration: "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
        });
        
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
    } finally {
      setIsLoading(false);
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
      
      let result;
      
      if (existingConfig) {
        // Update existing configuration - Convert config to a plain object for Json compatibility
        result = await supabase
          .from('configurations')
          .update({
            value: config as unknown as Json,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'document_processing');
      } else {
        // Insert new configuration - Convert config to a plain object for Json compatibility
        result = await supabase
          .from('configurations')
          .insert({
            key: 'document_processing',
            value: config as unknown as Json,
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
    <Card>
      <CardHeader>
        <CardTitle>Document Processing Settings</CardTitle>
        <CardDescription>
          Configure how documents are processed and stored in the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OpenAIKeyField 
          apiKey={config.apiKey} 
          onChange={handleSelectChange} 
          isLoading={isLoading} 
        />

        <ModelSelector 
          embeddingModel={config.embeddingModel} 
          onChange={handleSelectChange} 
          isLoading={isLoading} 
        />

        <ChunkSettings 
          chunkSize={config.chunkSize} 
          chunkOverlap={config.chunkOverlap} 
          onChange={handleChange} 
          isLoading={isLoading} 
        />

        <StoragePathField 
          storagePath={config.storagePath} 
          onChange={handleChange} 
          isLoading={isLoading} 
        />

        <CustomConfigField 
          customConfiguration={config.customConfiguration} 
          onChange={handleChange} 
          isLoading={isLoading} 
        />
      </CardContent>
      <CardFooter className="flex justify-between">
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
      </CardFooter>
    </Card>
  );
}
