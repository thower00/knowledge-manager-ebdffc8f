import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";
import { convertGoogleDriveUrl } from "@/components/admin/document-extraction/utils/urlUtils";
import { extractPdfWithProxy } from "./pdfExtractionService";
import { cleanPdfText, extractPlainText } from "@/components/admin/document-extraction/utils/textCleaningUtils";
import { extractPdfText } from "@/components/admin/document-extraction/utils/pdfUtils";

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
 * with client-side fallback and enhanced text cleaning
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
    
    // Try server-side extraction first
    try {
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
      
    } catch (serverError) {
      console.error("Server-side extraction failed, trying client-side fallback:", serverError);
      
      // Fallback to client-side PDF processing
      if (progressCallback) progressCallback(50);
      console.log("Attempting client-side PDF extraction as fallback");
      
      // Convert base64 back to ArrayBuffer for client-side processing
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;
      
      try {
        const clientText = await extractPdfText(arrayBuffer, (progress) => {
          if (progressCallback) {
            // Map client progress to our 50-95% range
            const mappedProgress = 50 + Math.floor((progress / 100) * 45);
            progressCallback(Math.min(mappedProgress, 95));
          }
        });
        
        if (progressCallback) progressCallback(100);
        console.log(`Client-side extraction successful: ${clientText.length} characters`);
        return clientText;
        
      } catch (clientError) {
        console.error("Client-side extraction also failed:", clientError);
        
        // Final fallback - return an informative message
        const fallbackMessage = `
Unable to extract text from this PDF document.

Server-side error: ${serverError instanceof Error ? serverError.message : String(serverError)}
Client-side error: ${clientError instanceof Error ? clientError.message : String(clientError)}

This could be due to:
1. The PDF being scan-based (images only)
2. Complex formatting or encryption
3. Network connectivity issues
4. Service temporarily unavailable

Please try:
- Ensuring the document is text-based (not scanned)
- Checking your internet connection
- Trying again in a few minutes
- Using a different document
        `;
        
        if (progressCallback) progressCallback(100);
        return fallbackMessage.trim();
      }
    }
  } catch (error) {
    console.error("Error in server-side PDF extraction:", error);
    if (progressCallback) progressCallback(100);
    throw error;
  }
}

/**
 * Fetch a document from URL and extract text using server-side processing
 * with client-side fallback and enhanced text cleaning
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
    
    // Process with server-side extraction (with client-side fallback)
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
    if (extractedText && !extractedText.includes("Unable to extract text")) {
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
