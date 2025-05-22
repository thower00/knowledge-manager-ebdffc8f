
import { supabase } from "@/integrations/supabase/client";
import { fetchDocumentViaProxy } from "./documentFetchService";

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
        // Call the server-side function
        console.log(`Attempt ${currentRetry + 1}: Calling server-side PDF processing function with options:`, options);
        
        const { data, error } = await supabase.functions.invoke("process-pdf", {
          body: { 
            pdfBase64: base64Data,
            options: options || {}
          },
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });
        
        if (error) {
          console.error("Server-side PDF processing failed:", error);
          throw new Error(`Server-side PDF processing failed: ${error.message}`);
        }
        
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
    
    // Fetch the document via proxy
    const documentData = await fetchDocumentViaProxy(documentUrl, documentTitle);
    
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
