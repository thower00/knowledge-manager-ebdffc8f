
import { supabase } from "@/integrations/supabase/client";
import { fetchDocumentViaProxy } from "./documentFetchService";
import { convertGoogleDriveUrl } from "../utils/urlUtils";
import { cleanAndNormalizeText } from "./textCleaningService";
import { extractPdfWithProxy } from "./pdfExtractionService";

interface ServerPdfExtractionOptions {
  maxPages?: number;
  streamMode?: boolean;
  timeout?: number;
}

/**
 * Extract text from a PDF using the server-side processing function
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
      console.log(`Successfully converted base64 to ArrayBuffer, size: ${documentData.byteLength}`);
    } else {
      // If it's already a base64 string
      base64Data = documentData;
    }
    
    if (progressCallback) progressCallback(20);
    
    // Call the proxy extraction service with enhanced options
    const extractionOptions = {
      ...options,
      timeout: Math.min(options?.timeout || 30, 30), // Cap at 30 seconds
      forceTextMode: true, // Force text-only extraction
      disableBinaryOutput: true, // Prevent binary data in output
      strictTextCleaning: true, // Request aggressive cleaning
      useAdvancedExtraction: true // New flag to use our most advanced extraction
    };
    
    return extractPdfWithProxy(base64Data, extractionOptions, progressCallback);
  } catch (error) {
    console.error("Error in server-side PDF extraction:", error);
    throw error;
  }
}

/**
 * Fetch a document from URL and extract text using server-side processing
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
    const { url: convertedUrl, wasConverted } = convertGoogleDriveUrl(documentUrl);
    console.log(`Original URL: ${documentUrl}`);
    console.log(`Converted URL: ${convertedUrl}`);
    
    if (wasConverted) {
      console.log("URL was converted to direct download format");
    }
    
    // Fetch the document via proxy
    let documentData: ArrayBuffer;
    try {
      documentData = await fetchDocumentViaProxy(convertedUrl, documentTitle);
      console.log(`Successfully fetched document, size: ${documentData.byteLength}`);
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
