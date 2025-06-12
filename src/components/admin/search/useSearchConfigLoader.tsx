
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSearchConfig, DEFAULT_SEARCH_CONFIG } from "./SearchConfigContext";
import type { SearchConfigSettings } from "./SearchConfigContext";

export function useSearchConfigLoader() {
  const { config, setConfig, isLoading, setIsLoading, isSaving, setIsSaving } = useSearchConfig();
  const { toast } = useToast();

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Loading search configuration from database...");
      
      const { data, error } = await supabase
        .from("configurations")
        .select("value")
        .eq("key", "search_settings")
        .maybeSingle();

      if (error) {
        console.error("Error loading search configuration:", error);
        throw new Error(error.message);
      }

      if (data?.value) {
        console.log("Search configuration loaded:", data.value);
        setConfig(data.value as unknown as SearchConfigSettings);
      } else {
        console.log("No search configuration found, using defaults");
        setConfig(DEFAULT_SEARCH_CONFIG);
      }
    } catch (error: any) {
      console.error("Failed to load search configuration:", error);
      toast({
        variant: "destructive",
        title: "Error loading search configuration",
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setConfig, toast]);

  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    try {
      console.log("Saving search configuration...", config);

      const { error } = await supabase
        .from("configurations")
        .upsert({
          key: "search_settings",
          value: config as any,
        });

      if (error) {
        console.error("Error saving search configuration:", error);
        throw new Error(error.message);
      }

      console.log("Search configuration saved successfully");
      toast({
        title: "Search configuration saved",
        description: "Your search settings have been saved successfully.",
      });
    } catch (error: any) {
      console.error("Failed to save search configuration:", error);
      toast({
        variant: "destructive",
        title: "Error saving search configuration",
        description: error.message,
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [config, setIsSaving, toast]);

  return {
    loadConfig,
    saveConfig,
    isLoading,
    isSaving,
    error: null,
  };
}
