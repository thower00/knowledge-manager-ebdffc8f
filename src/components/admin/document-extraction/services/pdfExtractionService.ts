
import { supabase } from "@/integrations/supabase/client";
import { cleanPdfText } from "../utils/textCleaningUtils";

interface ProxyExtractionOptions {
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
 * Extract PDF text using the server-side proxy
 * with enhanced error handling and text cleaning
 */
export async function extractPdfWithProxy(
  base64Data: string,
  options?: ProxyExtractionOptions,
  progressCallback?: (progress: number) => void
): Promise<string> {
  // Add retry mechanism for more reliability
  const maxRetries = 2;
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
          useAdvancedExtraction: true,
          useTextPatternExtraction: true
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
      
      // Apply additional text validation and transformation
      if (typeof data.text === 'string') {
        const extractedText = data.text;
        console.log(`PDF text extracted successfully, length: ${extractedText.length} chars`);
        console.log(`First 200 characters of extracted text: "${extractedText.substring(0, 200)}"`);
        
        // Use our improved text cleaning for binary-looking data
        const containsBinaryIndicators = isBinaryLooking(extractedText);
        if (containsBinaryIndicators) {
          console.log("Detected potential binary content, applying extra client-side cleaning");
          return cleanPdfText(extractedText);
        }
        
        return extractedText;
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
 * Check if text looks like it contains binary data or encoding issues
 */
function isBinaryLooking(text: string): boolean {
  if (!text || text.length < 100) return false;
  
  // Sample a portion of the text to check for binary indicators
  const sample = text.substring(0, Math.min(1000, text.length));
  
  // Check for indicators of binary content
  const binaryIndicators = [
    // High percentage of non-alphanumeric characters
    sample.replace(/[a-zA-Z0-9\s.,;:!?()\[\]{}'"$%&*+\-=<>|/\\]/g, '').length > sample.length * 0.25,
    
    // Low word-to-character ratio
    sample.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word)).length < sample.length / 40,
    
    // Random-looking sequences of special chars and letters
    /([\\\/\^~\*#@!\(\)\[\]{}]+[A-Za-z0-9]+){5,}/.test(sample),
    
    // Low percentage of spaces (natural text has many spaces)
    (sample.match(/\s/g)?.length || 0) < sample.length / 15,
    
    // Excessive use of Unicode characters
    sample.replace(/[\x00-\x7F]/g, '').length > sample.length * 0.2,
    
    // Contains characters that are often binary artifacts
    /[ÝîòôÐðÞþ±×÷§¥®©]/.test(sample)
  ];
  
  // Return true if at least two indicators are found
  return binaryIndicators.filter(Boolean).length >= 2;
}
