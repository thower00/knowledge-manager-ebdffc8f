
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

export async function processSelectedDocuments(
  documentSource: string, 
  sourceConfig: DocumentSourceConfig | null,
  selectedDocuments: string[]
) {
  if (!sourceConfig) {
    return { success: false, message: "Missing configuration" };
  }
  
  if (selectedDocuments.length === 0) {
    return { success: false, message: "No documents selected" };
  }
  
  if (documentSource === "google-drive") {
    console.log("Processing selected documents:", selectedDocuments);
    
    try {
      // Validate required fields before making the request
      if (!sourceConfig.client_email || !sourceConfig.private_key) {
        throw new Error("Missing required Google Drive credentials. Please update your configuration.");
      }
      
      // Create a promise that will reject after the specified timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 30000); // 30 seconds timeout
      });
      
      // Create the actual API call promise
      const apiCallPromise = supabase.functions.invoke("process-google-drive-documents", {
        body: { 
          client_email: sourceConfig.client_email,
          private_key: sourceConfig.private_key,
          documentIds: selectedDocuments,
        },
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      // Race the API call against the timeout
      const result = await Promise.race([
        apiCallPromise,
        timeoutPromise
      ]);
      
      // Now we need to await the result properly to get the actual response
      // Since we know it's the apiCallPromise that won if we reach here
      const response = await result;
      
      console.log("Edge function response:", response);

      if (response.error) {
        console.error("Edge function error:", response.error);
        throw new Error(response.error.message || "Failed to process documents");
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
        
        // Check for timeout
        if (errorMessage === "Request timeout") {
          errorMessage = "Request timed out. The operation took too long to complete.";
        }
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

  return { success: false, message: "Unsupported document source" };
}
