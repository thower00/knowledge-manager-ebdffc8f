
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfig, DEFAULT_CONFIG } from "./ConfigContext";
import { Json } from "@/integrations/supabase/types";

export function useConfigLoader(configKey: string = "document_processing") {
  const { config, setConfig, setIsLoading, setIsSaving } = useConfig();
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Loading ${configKey} configuration from database`);
      
      const { data, error: dbError } = await supabase
        .from("configurations")
        .select("value")
        .eq("key", configKey)
        .maybeSingle();
      
      if (dbError) {
        throw new Error(`Error loading configuration: ${dbError.message}`);
      }
      
      if (data?.value && typeof data.value === 'object' && data.value !== null) {
        console.log(`${configKey} configuration loaded:`, data.value);
        setConfig(prevConfig => ({
          ...prevConfig,
          ...(data.value as Record<string, any>)
        }));
      } else {
        console.log(`No ${configKey} configuration found in database, using defaults`);
      }
      
      return data;
    } catch (err: any) {
      console.error(`Error loading ${configKey} configuration:`, err);
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
      console.log(`Saving ${configKey} configuration to database:`, config);
      
      // Convert ConfigSettings to Json-compatible format
      const configAsJson: Json = JSON.parse(JSON.stringify(config));
      
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
      
      console.log(`${configKey} configuration saved successfully`);
    } catch (err: any) {
      console.error(`Error saving ${configKey} configuration:`, err);
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
