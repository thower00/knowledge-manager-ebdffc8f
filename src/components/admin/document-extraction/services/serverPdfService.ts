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
      console.log(`Successfully converted base64 to ArrayBuffer, size: ${documentData.byteLength}`);
    } else {
      // If it's already a base64 string
      base64Data = documentData;
    }
    
    if (progressCallback) progressCallback(20);
    
    // Add retry mechanism for more reliability
    const maxRetries = 3;
    let currentRetry = 0;
    let lastError: Error | null = null;
    
    while (currentRetry <= maxRetries) {
      try {
        // Call the server-side function directly with fetch for better control
        console.log(`Attempt ${currentRetry + 1}: Calling server-side PDF processing function with options:`, options);
        
        // Use a shorter timeout to avoid UI hanging too long
        const effectiveTimeout = Math.min(options?.timeout || 30, 30); // Cap at 30 seconds
        
        // Prepare request data
        const requestData = {
          pdfBase64: base64Data,
          options: {
            ...options,
            timeout: effectiveTimeout,
            forceTextMode: true, // Force text-only extraction to avoid binary data
            disableBinaryOutput: true, // New option to prevent binary data in output
            strictTextCleaning: true  // Add an extra flag for aggressive cleaning
          },
          timestamp: Date.now(),  // Add timestamp to avoid caching issues
          nonce: Math.random().toString(36).substring(2, 15)  // Add random nonce
        };
        
        // Use Supabase client for invoking the function
        const { data, error } = await supabase.functions.invoke('process-pdf', {
          body: requestData
        });
        
        if (error) {
          console.error(`Server-side PDF processing failed:`, error);
          throw new Error(`Server-side PDF processing failed: ${error.message}`);
        }
        
        if (!data) {
          throw new Error("No response data from PDF processor");
        }
        
        if (data.error) {
          throw new Error(`PDF processing error: ${data.error}`);
        }
        
        if (!data.text && !data.success) {
          throw new Error("No text extracted from PDF");
        }
        
        // Report success
        if (progressCallback) progressCallback(100);
        
        // Ensure the text is clean, not binary data
        if (typeof data.text === 'string') {
          console.log(`PDF text extracted successfully, length: ${data.text.length} chars`);
          console.log(`First 200 characters of extracted text: "${data.text.substring(0, 200)}"`);
          
          // Do not use placeholder text - use actual extracted text
          if (data.text.includes("Sample extracted text from") && data.text.length < 150) {
            console.warn("Detected placeholder text in extraction result, actual extraction may have failed");
            throw new Error("Received placeholder text instead of actual content");
          }
          
          // Apply enhanced text cleaning to prevent binary display issues
          const cleanedText = ensureReadableText(data.text);
          
          // Log the cleaning results
          console.log(`Text cleaning complete: original ${data.text.length} chars → cleaned ${cleanedText.length} chars`);
          console.log(`First 200 characters of cleaned text: "${cleanedText.substring(0, 200)}"`);
          
          return cleanedText;
        } else {
          throw new Error("Invalid text format in response");
        }
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
 * Enhanced text cleaning function to ensure we get readable text, not binary
 * This uses multiple strategies to clean text and prevent binary data showing up
 */
function ensureReadableText(text: string): string {
  if (!text || text.length === 0) return "";
  
  console.log("Running enhanced text cleaning for readability...");
  
  // Keep original text for comparison
  const originalText = text;
  
  try {
    // STRATEGY 1: Aggressive binary data removal
    let cleanedText = text
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ') // Remove control chars
      .replace(/[^\x20-\x7E\r\n\t]/g, ' ')                    // Keep ASCII printable
      .replace(/\uFFFD/g, ' ')                                // Replace replacement char
      .replace(/\s+/g, ' ')                                  // Collapse multiple spaces
      .trim();
      
    console.log(`Strategy 1 result: ${cleanedText.length} chars`);
      
    // If we still have sufficient text, use this version
    if (cleanedText.length > originalText.length * 0.4 && cleanedText.length > 300) {
      return cleanedText;
    }
    
    // STRATEGY 2: Extract words that contain letters - focus on meaningful words
    console.log("Strategy 1 removed too much text, trying word extraction...");
    const words = originalText.split(/\s+/)
      .filter(word => {
        // Only keep words with letters and minimum length
        return /[a-zA-Z]{2,}/.test(word) && word.length >= 2;
      })
      .join(' ');
      
    console.log(`Strategy 2 result: ${words.length} chars`);
      
    if (words.length > 300) {
      return words;
    }
    
    // STRATEGY 3: New approach - Pattern-based text extraction
    console.log("Trying pattern-based extraction...");
    
    // Look for common patterns in text documents
    const pagePatterns = originalText.match(/--- Page \d+ ---[\s\S]*?(?=--- Page \d+ ---|$)/g);
    if (pagePatterns && pagePatterns.length > 0) {
      const cleanedPages = pagePatterns.map(page => {
        // Extract title
        const pageTitle = page.match(/--- Page \d+ ---/) || ["Page"];
        
        // Clean page content
        const cleanContent = page
          .replace(/--- Page \d+ ---/, '')
          .replace(/[^\x20-\x7E\r\n\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
          
        return `${pageTitle[0]}\n${cleanContent}`;
      }).join('\n\n');
      
      console.log(`Page pattern extraction result: ${cleanedPages.length} chars`);
      
      if (cleanedPages.length > 200) {
        return cleanedPages;
      }
    }
    
    // STRATEGY 4: Last resort - extract anything that looks like words with regex
    console.log("Using regex pattern matching as last resort...");
    
    // Extract sequences that look like words with more aggressive pattern
    const textMatches = originalText.match(/([a-zA-Z][a-zA-Z0-9\s.,;:!?()\[\]{}'"$%&*+\-=<>|/\\]{2,})/g) || [];
    const extractedText = textMatches.join(' ').replace(/\s+/g, ' ').trim();
    
    console.log(`Strategy 4 result: ${extractedText.length} chars`);
    
    if (extractedText.length > 50) {
      return extractedText;
    }
    
    // If all else fails, attempt one more with pure ASCII filtering
    const asciiOnly = originalText.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                           .replace(/\s+/g, ' ')
                           .trim();
                           
    console.log(`ASCII-only filtering result: ${asciiOnly.length} chars`);
    
    if (asciiOnly.length > 50) {
      return asciiOnly;
    }
    
    // If all else fails, return a helpful error message
    return "Could not extract readable text from this document. The PDF might contain only scanned images without embedded text or have security restrictions.";
  } catch (error) {
    console.error("Error during text cleaning:", error);
    return "Error cleaning text from document. The extracted content may be in a format that cannot be properly displayed.";
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
      console.log(`Successfully converted base64 to ArrayBuffer, size: ${documentData.byteLength}`);
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
