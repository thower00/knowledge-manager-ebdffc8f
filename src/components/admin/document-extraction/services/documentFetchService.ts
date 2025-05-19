
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Fetches a document through the proxy service
 * @param url URL of document to fetch
 * @param title Optional document title for better error messages
 * @param documentId Optional document ID for storing binary in database
 * @param storeInDatabase Whether to store the document binary in database
 * @returns ArrayBuffer of document data
 */
export const fetchDocumentViaProxy = async (
  url: string,
  title?: string,
  documentId?: string,
  storeInDatabase: boolean = false
): Promise<ArrayBuffer> => {
  try {
    console.log("Calling pdf-proxy Edge Function with URL:", url);
    console.log("Store in database:", storeInDatabase);
    
    const { data, error: functionError } = await supabase.functions.invoke("pdf-proxy", {
      body: { 
        url,
        title,
        documentId: storeInDatabase ? documentId : undefined,
        storeInDatabase,
        // Add additional context that might help with debugging
        requestedAt: new Date().toISOString()
      }
    });

    // Explicit error checking for Edge Function call
    if (functionError) {
      console.error("Edge function error:", functionError);
      throw new Error(`Proxy service error: ${functionError.message || "Unknown error"}`);
    }
    
    if (!data) {
      throw new Error("No data received from proxy");
    }
    
    console.log("Received data from proxy service, processing...");
    
    // Convert the base64 data to ArrayBuffer
    try {
      const binaryString = window.atob(data as string);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log("Successfully converted base64 to ArrayBuffer, size:", bytes.length);
      
      return bytes.buffer;
    } catch (decodeError) {
      console.error("Error decoding base64 data:", decodeError);
      throw new Error(`Failed to decode document data: ${decodeError.message}`);
    }
  } catch (proxyError) {
    console.error("Proxy fetch failed:", proxyError);
    
    // More specific error messages
    let errorMessage = "Failed to fetch document through proxy";
    if (proxyError instanceof Error) {
      errorMessage = proxyError.message;
      
      // Enhance known error types
      if (errorMessage.includes("Failed to fetch")) {
        errorMessage = "Network error: Unable to connect to the proxy service. Please check your internet connection and try again.";
      } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        errorMessage = "The request timed out. The document may be too large or the server is not responding.";
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Fetches document binary directly from database if available
 * @param documentId Document ID to fetch binary for
 * @returns ArrayBuffer of document data or null if not found
 */
export const fetchDocumentFromDatabase = async (documentId: string): Promise<ArrayBuffer | null> => {
  try {
    console.log("Attempting to fetch document binary from database for ID:", documentId);
    
    const { data, error } = await supabase
      .from('document_binaries')
      .select('binary_data, content_type')
      .eq('document_id', documentId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching document from database:", error);
      return null;
    }
    
    if (!data || !data.binary_data) {
      console.log("No document binary found in database");
      return null;
    }
    
    console.log("Found document binary in database:", {
      contentType: data.content_type,
      size: data.binary_data.length
    });
    
    try {
      // Convert from base64 to ArrayBuffer
      const binaryString = window.atob(data.binary_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log("Successfully converted database binary to ArrayBuffer, size:", bytes.length);
      
      return bytes.buffer;
    } catch (decodeError) {
      console.error("Error converting database binary to ArrayBuffer:", decodeError);
      throw new Error(`Failed to decode document from database: ${decodeError.message}`);
    }
  } catch (error) {
    console.error("Error in fetchDocumentFromDatabase:", error);
    return null;
  }
};
