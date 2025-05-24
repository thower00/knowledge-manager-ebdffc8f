import { fetchDocumentViaProxy } from "./documentFetchService";
import { convertGoogleDriveUrl } from "../utils/urlUtils";
import { extractPdfWithProxy } from "./pdfExtractionService";
import { cleanPdfText, extractPlainText } from "../utils/textCleaningUtils";

interface ServerPdfExtractionOptions {
  maxPages?: number;
  streamMode?: boolean;
  timeout?: number;
  forceTextMode?: boolean;
  disableBinaryOutput?: boolean;
  strictTextCleaning?: boolean;
  useAdvancedExtraction?: boolean;
  useTextPatternExtraction?: boolean;
}

/**
 * Extract text from a PDF using the server-side processing function
 * with enhanced text cleaning
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
      console.log(`Successfully converted ArrayBuffer to base64, size: ${documentData.byteLength}`);
    } else {
      // If it's already a base64 string
      base64Data = documentData;
    }
    
    if (progressCallback) progressCallback(20);
    
    // Call the proxy extraction service with enhanced options
    const extractionOptions = {
      ...options,
      timeout: Math.min(options?.timeout || 30, 60), // Cap at 60 seconds
      forceTextMode: true, // Force text-only extraction
      disableBinaryOutput: true, // Prevent binary data in output
      strictTextCleaning: true, // Request aggressive cleaning
      useAdvancedExtraction: true, // Flag for advanced extraction
      useTextPatternExtraction: true // Enable pattern extraction
    };
    
    // Get initial text from proxy
    let extractedText = await extractPdfWithProxy(base64Data, extractionOptions, progressCallback);
    
    // Apply additional client-side cleaning for better results
    if (progressCallback) progressCallback(90);
    console.log("Applying additional client-side text cleaning to improve readability");
    
    // Check if text appears to be binary and apply more aggressive cleaning if needed
    if (extractedText) {
      extractedText = extractPlainText(extractedText);
    }
    
    if (progressCallback) progressCallback(100);
    return extractedText;
  } catch (error) {
    console.error("Error in server-side PDF extraction:", error);
    throw error;
  }
}

/**
 * Fetch a document from URL and extract text using server-side processing
 * with enhanced text cleaning
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
    let extractedText = await extractPdfTextServerSide(
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
    
    // Run an additional cleaning pass for particularly problematic documents
    if (extractedText) {
      // Check if the text still looks like binary data after initial cleaning
      const sampleText = extractedText.substring(0, 500);
      if (/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/.test(sampleText) || 
          /[^\x20-\x7E\r\n\t\u00A0-\u00FF\u2000-\u206F]/.test(sampleText)) {
        console.log("Text still appears corrupted, applying ultra-aggressive cleaning");
        extractedText = cleanPdfText(extractedText);
      }
    }
    
    return extractedText;
  } catch (error) {
    console.error("Error in fetch and extract:", error);
    throw error;
  }
}
