
import { supabase } from "@/integrations/supabase/client";
import { DocumentSourceConfig } from "@/types/document";
import { maskSecretsInObject } from "@/utils/logging";
import { logger } from "@/utils/logger";

/**
 * Fetches source configuration for document integration
 */
export async function fetchSourceConfig(documentSource: string) {
  try {
    if (documentSource) {
      const { data, error } = await supabase
        .from("configurations")
        .select("value")
        .eq("key", `${documentSource.replace('-', '_')}_integration`)
        .maybeSingle();

      if (error) {
        logger.error("Error fetching source config:", error);
        return { error: `Could not load ${documentSource} configuration. Please set it up in Configuration Management.` };
      }

      if (!data) {
        return { error: `No configuration found for ${documentSource}. Please set it up in Configuration Management.` };
      }

      logger.info("Retrieved source config:", maskSecretsInObject(data));
      return { config: data.value as DocumentSourceConfig };
    }
  } catch (err) {
    logger.error("Error in fetchSourceConfig:", err);
    return { error: "An unexpected error occurred while fetching configuration." };
  }
  
  return { error: "No document source specified." };
}
