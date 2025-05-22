
import { supabase } from "@/integrations/supabase/client";
import { fetchDocumentViaProxy } from "./documentFetchService";
import { convertGoogleDriveUrl } from "../utils/urlUtils";

interface ServerPdfExtractionOptions {
  maxPages?: number;
  streamMode?: boolean;
  timeout?: number;
}

/**
 * Extract text from a PDF using the server-side processing function
 * @param documentData URL of the document to process
 * @param options Extraction options
 * @returns Extracted text
 */
export async function extractPdfTextServerSide(
  documentData: ArrayBuffer | string, 
  options?: ServerPdfExtractionOptions,
  progressCallback?: (progress: number) => void
): Promise<string> {
  try {
    // Report initial progress
    if (progressCallback) progressCallback(10);
    
    // Convert ArrayBuffer to base64 if needed
    let base64Data: string;
    if (documentData instanceof ArrayBuffer) {
      base64Data = btoa(
        new Uint8Array(documentData).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
    } else {
      // If it's already a base64 string
      base64Data = documentData;
    }
    
    if (progressCallback) progressCallback(20);
    
    // Add retry mechanism for more reliability
    const maxRetries = 2;
    let currentRetry = 0;
    let lastError: Error | null = null;
    
    while (currentRetry <= maxRetries) {
      try {
        // Call the server-side function directly with fetch for better control
        console.log(`Attempt ${currentRetry + 1}: Calling server-side PDF processing function with options:`, options);
        
        // Prepare authentication headers
        const session = await supabase.auth.getSession();
        const authToken = session.data.session?.access_token || '';
        
        // Access the anon key from the environment
        const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0";

        // Direct fetch to the edge function
        const functionUrl = 'https://sxrinuxxlmytddymjbmr.supabase.co/functions/v1/process-pdf';
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': apiKey,
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ 
            pdfBase64: base64Data,
            options: options || {}
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server-side PDF processing failed with status ${response.status}:`, errorText);
          throw new Error(`Server-side PDF processing failed: HTTP ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data || (!data.text && !data.success)) {
          throw new Error("No text extracted from PDF");
        }
        
        // Report success
        if (progressCallback) progressCallback(100);
        
        return data.text;
      } catch (error) {
        console.error(`Attempt ${currentRetry + 1} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (currentRetry < maxRetries) {
          // Wait before retrying (with exponential backoff)
          const delay = Math.pow(2, currentRetry) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          currentRetry++;
          if (progressCallback) progressCallback(Math.min(20 + currentRetry * 10, 60));
        } else {
          // We've exhausted retries
          throw lastError;
        }
      }
    }
    
    // This should never happen due to the throw in the else block above
    throw lastError || new Error("Unknown error processing PDF");
  } catch (error) {
    console.error("Error in server-side PDF extraction:", error);
    throw error;
  }
}

/**
 * Fetch a document from URL and extract text using server-side processing
 * @param documentUrl URL of the document
 * @param documentTitle Document title
 * @param options Extraction options
 * @returns Extracted text
 */
export async function fetchAndExtractPdfServerSide(
  documentUrl: string,
  documentTitle: string,
  options?: ServerPdfExtractionOptions,
  progressCallback?: (progress: number) => void
): Promise<string> {
  try {
    // Report initial progress
    if (progressCallback) progressCallback(5);
    
    // Convert Google Drive URL if needed - critical for access
    const { url: convertedUrl } = convertGoogleDriveUrl(documentUrl);
    console.log(`Original URL: ${documentUrl}`);
    console.log(`Converted URL: ${convertedUrl}`);
    
    // Fetch the document via proxy
    let documentData: ArrayBuffer;
    try {
      documentData = await fetchDocumentViaProxy(convertedUrl, documentTitle);
    } catch (proxyError) {
      console.error("Error fetching document via proxy:", proxyError);
      throw new Error(`Failed to fetch document: ${proxyError instanceof Error ? proxyError.message : String(proxyError)}`);
    }
    
    // Update progress
    if (progressCallback) progressCallback(40);
    
    // Process with server-side extraction
    return extractPdfTextServerSide(
      documentData, 
      options,
      progress => {
        // Map the progress to our 40-100% range
        if (progressCallback) {
          const mappedProgress = 40 + Math.floor((progress / 100) * 60);
          progressCallback(Math.min(mappedProgress, 100));
        }
      }
    );
  } catch (error) {
    console.error("Error in fetch and extract:", error);
    throw error;
  }
}
