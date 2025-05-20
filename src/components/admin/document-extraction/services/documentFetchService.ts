
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches a document through the proxy service
 * @param url URL of document to fetch
 * @param title Optional document title for better error messages
 * @returns ArrayBuffer of document data
 */
export const fetchDocumentViaProxy = async (
  url: string,
  title?: string
): Promise<ArrayBuffer> => {
  try {
    console.log("Calling pdf-proxy Edge Function with URL:", url);
    
    // Add a timestamp to prevent caching issues
    const { data, error: functionError } = await supabase.functions.invoke("pdf-proxy", {
      body: { 
        url,
        title,
        requestedAt: new Date().toISOString(),
        timestamp: Date.now() // Add timestamp to bust cache
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
      } else if (errorMessage.includes("Access denied") && errorMessage.includes("Google Drive")) {
        errorMessage = "Access denied. Make sure the Google Drive document is shared with 'Anyone with the link'.";
      }
    }
    
    throw new Error(errorMessage);
  }
};
