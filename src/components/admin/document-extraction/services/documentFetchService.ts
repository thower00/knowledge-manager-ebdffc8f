
import { supabase } from "@/integrations/supabase/client";
import { convertGoogleDriveUrl } from "../utils/urlUtils";

/**
 * Fetches a document through the proxy service
 * @param url URL of document to fetch (leave empty for connection test)
 * @param title Optional document title for better error messages
 * @param maxRetries Number of retry attempts (default: 2)
 * @returns ArrayBuffer of document data
 */
export const fetchDocumentViaProxy = async (
  url: string,
  title: string = "untitled",
  maxRetries = 2
): Promise<ArrayBuffer> => {
  let retryCount = 0;
  let lastError: Error | null = null;
  
  // Implement progressive backoff for retries
  const backoffMs = [750, 1500, 3000]; // Increasing wait times
  
  // Connection test mode if URL is empty or explicitly specified
  const isConnectionTest = !url || title === "connection_test";
  
  // Ensure Google Drive URLs are in the correct format
  if (!isConnectionTest && url.includes('drive.google.com')) {
    const { url: convertedUrl, wasConverted } = convertGoogleDriveUrl(url);
    if (wasConverted) {
      console.log(`Google Drive URL converted from: ${url}`);
      console.log(`To direct download URL: ${convertedUrl}`);
      url = convertedUrl;
    }
  }
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1}/${maxRetries + 1}: Calling pdf-proxy Edge Function`);
      if (isConnectionTest) {
        console.log("This is a connection test");
      } else {
        console.log("Fetching document from URL:", url);
      }
      
      // Add a timestamp and nonce to prevent caching issues
      const nonce = Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();
      
      // Access the anon key directly from a constant - this is a public key
      const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0";
      
      // Get the auth token
      const authSession = await supabase.auth.getSession();
      const authToken = authSession.data.session?.access_token || '';
      
      // Use direct fetch for better control and debugging
      const proxyUrl = 'https://sxrinuxxlmytddymjbmr.supabase.co/functions/v1/pdf-proxy';
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': apiKey,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({ 
          url,
          title,
          action: isConnectionTest ? "connection_test" : "fetch_document",
          has_url: !!url,
          timestamp,
          nonce, // Add random nonce for cache busting
          noCache: true // Explicit no-cache flag
        })
      });

      // Explicit error checking for Edge Function call
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Proxy error (${response.status}): ${errorText}`);
        throw new Error(`Proxy error: ${response.status} - ${errorText || "Unknown error"}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        throw new Error("No data received from proxy");
      }
      
      // For connection tests, just return an empty ArrayBuffer
      if (isConnectionTest) {
        console.log("Connection test successful");
        return new ArrayBuffer(0);
      }
      
      console.log(`Attempt ${retryCount + 1}: Received data from proxy service, processing...`);
      
      // Convert the base64 data to ArrayBuffer
      try {
        const binaryString = window.atob(data as string);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log(`Successfully converted base64 to ArrayBuffer, size: ${bytes.length}`);
        
        return bytes.buffer;
      } catch (decodeError) {
        console.error("Error decoding base64 data:", decodeError);
        throw new Error(`Failed to decode document data: ${decodeError.message}`);
      }
    } catch (proxyError) {
      console.error(`Attempt ${retryCount + 1}: Proxy fetch failed:`, proxyError);
      lastError = proxyError instanceof Error ? proxyError : new Error(String(proxyError));
      
      if (retryCount < maxRetries) {
        const waitTime = backoffMs[retryCount] || 3000;
        console.log(`Waiting ${waitTime}ms before retry ${retryCount + 1}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retryCount++;
      } else {
        // More specific error messages
        let errorMessage = "Failed to fetch document through proxy after multiple attempts";
        if (lastError instanceof Error) {
          errorMessage = lastError.message;
          
          // Enhance known error types
          if (errorMessage.includes("Failed to fetch")) {
            errorMessage = "Network error: Unable to connect to the proxy service. Please check your internet connection and try again.";
          } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
            errorMessage = "The request timed out. The document may be too large or the server is not responding.";
          } else if (errorMessage.includes("Access denied") && errorMessage.includes("Google Drive")) {
            errorMessage = "Access denied. Make sure the Google Drive document is shared with 'Anyone with the link'.";
          } else if (errorMessage.includes("pdf.worker")) {
            errorMessage = "Failed to load PDF processing components. This may be due to network restrictions or content filtering.";
          }
        }
        
        throw new Error(errorMessage);
      }
    }
  }
  
  // This should never be reached due to the throw in the else block above
  throw lastError || new Error("Unknown error during document fetch");
};
