
import { supabase } from "@/integrations/supabase/client";
import { DocumentSourceConfig, DocumentFile } from "@/types/document";

export async function fetchSourceConfig(documentSource: string) {
  try {
    if (documentSource) {
      const { data, error } = await supabase
        .from("configurations")
        .select("value")
        .eq("key", `${documentSource.replace('-', '_')}_integration`)
        .maybeSingle();

      if (error) {
        console.error("Error fetching source config:", error);
        return { error: `Could not load ${documentSource} configuration. Please set it up in Configuration Management.` };
      }

      if (!data) {
        return { error: `No configuration found for ${documentSource}. Please set it up in Configuration Management.` };
      }

      console.log("Retrieved source config:", data);
      return { config: data.value as DocumentSourceConfig };
    }
  } catch (err) {
    console.error("Error in fetchSourceConfig:", err);
    return { error: "An unexpected error occurred while fetching configuration." };
  }
  
  return { error: "No document source specified." };
}

export async function fetchGoogleDriveDocuments(sourceConfig: DocumentSourceConfig) {
  console.log("Fetching Google Drive documents with config:", {
    client_email: sourceConfig.client_email ? "✓ Present" : "✗ Missing",
    private_key: sourceConfig.private_key ? "✓ Present" : "✗ Missing",
    folder_id: sourceConfig.folder_id || "Not specified",
  });
  
  try {
    const { data, error } = await supabase.functions.invoke("list-google-drive-files", {
      body: { 
        client_email: sourceConfig.client_email,
        private_key: sourceConfig.private_key,
        folder_id: sourceConfig.folder_id || "",
      },
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error(error.message || "Failed to fetch documents");
    }

    console.log("Google Drive API response:", data);
    
    if (data?.files) {
      return data.files as DocumentFile[];
    }
    
    return [] as DocumentFile[];
  } catch (err) {
    console.error("Error invoking Edge function:", err);
    throw new Error(err instanceof Error ? err.message : "Failed to fetch documents from Google Drive");
  }
}

export async function processSelectedDocuments(
  documentSource: string, 
  sourceConfig: DocumentSourceConfig | null,
  selectedDocuments: string[]
) {
  if (documentSource === "google-drive") {
    console.log("Processing selected documents:", selectedDocuments);
    
    try {
      const { data, error } = await supabase.functions.invoke("process-google-drive-documents", {
        body: { 
          client_email: sourceConfig?.client_email,
          private_key: sourceConfig?.private_key,
          documentIds: selectedDocuments,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to process documents");
      }

      return { success: true, message: `Processing ${selectedDocuments.length} document(s). This may take some time.` };
    } catch (err) {
      console.error("Error invoking Edge function:", err);
      throw new Error(err instanceof Error ? err.message : "Failed to process documents");
    }
  }

  return { success: false, message: "Unsupported document source" };
}
