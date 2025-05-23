
import { supabase } from "@/integrations/supabase/client";
import { cleanAndNormalizeText, extractTextAlternatives } from "./textCleaningService";

interface ProxyExtractionOptions {
  maxPages?: number;
  streamMode?: boolean;
  timeout?: number;
  forceTextMode?: boolean;
  disableBinaryOutput?: boolean;
  strictTextCleaning?: boolean;
  useAdvancedExtraction?: boolean;
}

/**
 * Extract PDF text using the server-side proxy
 */
export async function extractPdfWithProxy(
  base64Data: string,
  options?: ProxyExtractionOptions,
  progressCallback?: (progress: number) => void
): Promise<string> {
  // Add retry mechanism for more reliability
  const maxRetries = 3;
  let currentRetry = 0;
  let lastError: Error | null = null;
  
  while (currentRetry <= maxRetries) {
    try {
      if (progressCallback) progressCallback(20 + currentRetry * 5);
      
      // Call the server-side function with enhanced options
      console.log(`Attempt ${currentRetry + 1}: Calling server-side PDF processing function with options:`, options);
      
      // Prepare request data with advanced extraction flags
      const requestData = {
        pdfBase64: base64Data,
        options: {
          ...options,
          timeout: options?.timeout || 30,
          forceTextMode: true,
          disableBinaryOutput: true,
          strictTextCleaning: true,
          useTextPatternExtraction: true // New flag for pattern-based extraction
        },
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(2, 15)
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
      
      // Report success
      if (progressCallback) progressCallback(95);
      
      // Enhanced text cleaning to ensure we don't get binary data
      if (typeof data.text === 'string') {
        console.log(`PDF text extracted successfully, length: ${data.text.length} chars`);
        console.log(`First 200 characters of extracted text: "${data.text.substring(0, 200)}"`);
        
        // Special handling for binary-looking text
        if (containsBinaryIndicators(data.text)) {
          console.log("Detected potential binary content, applying extra cleaning");
          
          // Apply ultra-aggressive cleaning
          const cleanedText = cleanAndNormalizeText(data.text);
          console.log(`Text cleaning complete: original ${data.text.length} chars → cleaned ${cleanedText.length} chars`);
          
          // Try alternative extraction if cleaned text still seems problematic
          if (containsBinaryIndicators(cleanedText) && cleanedText.length < 200) {
            const alternatives = extractTextAlternatives(data.text);
            if (alternatives.length > 0 && alternatives[0].length > cleanedText.length) {
              console.log("Using alternative extraction method with better results");
              return alternatives[0];
            }
          }
          
          return cleanedText;
        }
        
        return data.text;
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
}

/**
 * Check if text likely contains binary data indicators
 */
function containsBinaryIndicators(text: string): boolean {
  if (!text || text.length < 20) return false;
  
  // Check for various indicators of binary/corrupted content
  const binaryIndicators = [
    // High concentration of special characters
    text.replace(/[a-zA-Z0-9\s.,;:!?()\[\]{}'"$%&*+\-=<>|/\\]/g, '').length > text.length * 0.25,
    
    // Low word-to-character ratio (binary data often has few proper words)
    text.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word)).length < text.length / 30,
    
    // High concentration of control characters
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(text),
    
    // Random-looking sequences of letters, numbers and symbols
    /([\\\/\^~\*#@!\(\)\[\]{}]+[A-Za-z0-9]+){5,}/.test(text)
  ];
  
  // Return true if at least two indicators are found
  return binaryIndicators.filter(Boolean).length >= 2;
}
