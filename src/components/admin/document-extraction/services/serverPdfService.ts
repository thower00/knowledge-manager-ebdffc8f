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
        
        // Shorten the timeout to avoid UI hanging too long
        const effectiveTimeout = Math.min(options?.timeout || 45, 45); // Cap at 45 seconds
        
        // Prepare request data
        const requestData = {
          pdfBase64: base64Data,
          options: {
            ...options,
            timeout: effectiveTimeout
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
        
        // Ensure the text is a string, not binary data
        if (typeof data.text === 'string') {
          console.log(`PDF text extracted successfully, length: ${data.text.length} chars`);
          
          // Enhanced binary data cleaning - apply more aggressive filtering
          let cleanedText = data.text;
          
          // Check if the text appears to contain binary data (common indicators)
          const hasBinaryIndicators = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\xAD\u0600-\u0605\u061C\u06DD\u070F\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]/.test(cleanedText) ||
                                    /[Ý|î|ò|ô|Ð|ð|Þ|þ|±|×|÷|¶|§|¦|¬|¢|¥|®|©|µ|¼|½|¾|¿|¡|«|»|°|·|´|`|¨|¯|¸|¹|²|³]/.test(cleanedText) ||
                                    cleanedText.includes('�');
                                    
          if (hasBinaryIndicators || true) { // Always clean the text as a safety measure
            console.log("Detected possible binary content, applying aggressive cleaning...");
            
            // Multi-step cleaning approach
            // Step 1: First attempt - keep only ASCII printable and common whitespace
            cleanedText = cleanedText
              .replace(/[^\x20-\x7E\r\n\t]/g, ' ')  // Replace non-ASCII with spaces
              .replace(/\s+/g, ' ')                 // Collapse multiple whitespace
              .trim();
              
            console.log(`After initial cleaning: ${cleanedText.length} chars remain`);
            
            // Step 2: If most of the text was lost, try extracting only words with letters
            if (cleanedText.length < data.text.length * 0.1 || cleanedText.length < 500) {
              console.log("First cleaning removed too much content, trying word extraction approach");
              
              // Extract words that contain at least one letter (more permissive)
              const words = data.text.split(/\s+/)
                .filter(word => /[a-zA-Z]/.test(word) && word.length >= 2)
                .join(' ');
                
              if (words.length > cleanedText.length) {
                cleanedText = words;
                console.log(`Word extraction approach recovered more text: ${cleanedText.length} chars`);
              }
            }
            
            // Step 3: Check if we still have viable text, otherwise use even more permissive approach
            if (cleanedText.length < 500) {
              console.log("Still insufficient text, using character frequency analysis");
              
              // Count characters to find the most common ones (likely to be valid text)
              const charCount = new Map();
              for (const char of data.text) {
                charCount.set(char, (charCount.get(char) || 0) + 1);
              }
              
              // Keep only the most common characters that appear to be text
              const commonChars = [...charCount.entries()]
                .sort((a, b) => b[1] - a[1])
                .filter(([char]) => {
                  const code = char.charCodeAt(0);
                  return (code >= 32 && code <= 126) || // ASCII printable
                         code === 10 || code === 13 || code === 9; // Line breaks and tab
                })
                .slice(0, 50) // Take top 50 most common characters
                .map(([char]) => char);
                
              // Create a set for faster lookups
              const validChars = new Set(commonChars);
              
              // Filter the text to keep only these common characters
              cleanedText = data.text
                .split('')
                .map(char => validChars.has(char) ? char : ' ')
                .join('')
                .replace(/\s+/g, ' ')
                .trim();
                
              console.log(`Character frequency approach produced: ${cleanedText.length} chars`);
            }
            
            // Final verification - if we don't have enough meaningful content, provide a fallback message
            if (cleanedText.length < 200 || !/[a-zA-Z]{2,}/.test(cleanedText)) {
              console.warn("Failed to extract readable text content after multiple cleaning attempts");
              
              // Return a helpful fallback message
              return `The document appears to contain mainly binary or encoded data that could not be converted to readable text.\n\nThis may indicate one of the following issues:\n- The document may be a scan-based PDF without embedded text\n- The PDF may have unusual encoding or compression\n- The document might be password-protected or have security restrictions\n\nPlease try with a different document or use OCR software to extract the text first.`;
            }
            
            console.log(`Text cleaned: original ${data.text.length} chars → cleaned ${cleanedText.length} chars`);
          }
          
          // Return cleaned text
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
