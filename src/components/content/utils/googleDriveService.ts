
import { supabase } from "@/integrations/supabase/client";
import { DocumentSourceConfig, DocumentFile } from "@/types/document";

/**
 * Fetches documents from Google Drive
 */
export async function fetchGoogleDriveDocuments(sourceConfig: DocumentSourceConfig) {
  console.log("Fetching Google Drive documents with config:", {
    client_email: sourceConfig.client_email ? "✓ Present" : "✗ Missing",
    private_key: sourceConfig.private_key ? "✓ Present" : "✗ Missing",
    folder_id: sourceConfig.folder_id || "Not specified",
  });
  
  try {
    // Validate required fields before making the request
    if (!sourceConfig.client_email || !sourceConfig.private_key) {
      throw new Error("Missing required Google Drive credentials. Please update your configuration.");
    }
    
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

    if (!data) {
      console.error("Edge function returned no data");
      throw new Error("No response data from edge function");
    }

    console.log("Google Drive API response:", data);
    
    if (data.error) {
      throw new Error(`Error from Google Drive: ${data.error}`);
    }
    
    if (data.files) {
      return data.files as DocumentFile[];
    }
    
    return [] as DocumentFile[];
  } catch (err) {
    console.error("Error invoking Edge function:", err);
    let errorMessage = "Failed to fetch documents from Google Drive";
    
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    // Specific error handling for network-related issues
    if (errorMessage.includes("NetworkError") || errorMessage.includes("Failed to fetch")) {
      errorMessage = "Network error: Unable to connect to the Edge function. Please check your internet connection and try again.";
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Processes selected documents from Google Drive
 */
export async function processGoogleDriveDocuments(
  sourceConfig: DocumentSourceConfig | null,
  selectedDocuments: string[]
) {
  if (!sourceConfig) {
    return { success: false, message: "Missing configuration" };
  }
  
  if (selectedDocuments.length === 0) {
    return { success: false, message: "No documents selected" };
  }
  
  console.log("Processing selected documents:", selectedDocuments);
  
  try {
    // Validate required fields before making the request
    if (!sourceConfig.client_email || !sourceConfig.private_key) {
      throw new Error("Missing required Google Drive credentials. Please update your configuration.");
    }
    
    // Make sure we're using consistent headers and explicit content-type
    console.log("Calling process-google-drive-documents edge function");
    const { data, error } = await supabase.functions.invoke("process-google-drive-documents", {
      body: { 
        client_email: sourceConfig.client_email,
        private_key: sourceConfig.private_key,
        documentIds: selectedDocuments,
      },
    });
    
    console.log("Edge function response:", { data, error });

    // Handle errors from the edge function
    if (error) {
      console.error("Edge function error:", error);
      throw new Error(error.message || "Failed to process documents");
    }

    return { 
      success: true, 
      message: `Processing ${selectedDocuments.length} document(s). This may take some time.` 
    };
  } catch (err) {
    console.error("Error invoking process-google-drive-documents:", err);
    let errorMessage = "Failed to process documents";
    
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    // Specific error handling for network-related issues
    if (
      typeof errorMessage === 'string' && 
      (errorMessage.includes("NetworkError") || 
       errorMessage.includes("Failed to fetch") || 
       errorMessage.includes("network"))
    ) {
      errorMessage = "Network error: Unable to connect to the Edge function. Please check your internet connection and try again.";
    }
    
    return { success: false, message: errorMessage };
  }
}
