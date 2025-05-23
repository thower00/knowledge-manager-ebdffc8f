
import { supabase } from "@/integrations/supabase/client";
import { cleanAndNormalizeText } from "./textCleaningService";

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
          useAdvancedExtraction: true, // Enhanced extraction
          useTextPatternExtraction: true // Pattern-based extraction
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
      
      // Additional text validation and transformation
      if (typeof data.text === 'string') {
        const extractedText = data.text;
        console.log(`PDF text extracted successfully, length: ${extractedText.length} chars`);
        console.log(`First 200 characters of extracted text: "${extractedText.substring(0, 200)}"`);
        
        // Apply additional cleaning if it appears to be binary data
        if (isBinaryLooking(extractedText)) {
          console.log("Detected potential binary content, applying extra client-side cleaning");
          return cleanBinaryLookingText(extractedText);
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
  
  // Check for indicators of binary content
  const binaryIndicators = [
    // High percentage of non-alphanumeric characters
    text.replace(/[a-zA-Z0-9\s.,;:!?()\[\]{}'"$%&*+\-=<>|/\\]/g, '').length > text.length * 0.3,
    
    // Low word-to-character ratio
    text.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word)).length < text.length / 40,
    
    // Random-looking sequences of special chars and letters
    /([\\\/\^~\*#@!\(\)\[\]{}]+[A-Za-z0-9]+){5,}/.test(text),
    
    // Low percentage of common English words
    countCommonWords(text) < text.length / 200
  ];
  
  // Return true if at least two indicators are found
  return binaryIndicators.filter(Boolean).length >= 2;
}

/**
 * Count occurrences of common English words as a heuristic for meaningful text
 */
function countCommonWords(text: string): number {
  const commonWords = ['the', 'and', 'that', 'have', 'for', 'not', 'this', 'with', 'you', 'which'];
  let count = 0;
  
  for (const word of commonWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    count += matches ? matches.length : 0;
  }
  
  return count;
}

/**
 * Clean text that appears to contain binary data using more aggressive methods
 */
function cleanBinaryLookingText(text: string): string {
  // First apply standard cleaning
  let cleaned = cleanAndNormalizeText(text);
  
  // Extract complete sentences for better readability
  const sentencesMatch = cleaned.match(/[A-Z][^.!?]+[.!?]/g);
  if (sentencesMatch && sentencesMatch.join(' ').length > 200) {
    return sentencesMatch.join(' ');
  }
  
  // Extract meaningful word sequences as fallback
  const wordSequences = cleaned.match(/[a-zA-Z]{3,}(\s+[a-zA-Z]{2,}){3,}/g);
  if (wordSequences && wordSequences.length > 5) {
    return wordSequences.join(' ');
  }
  
  // If still problematic, use only the most likely real text parts
  const letterOnlyWords = cleaned.split(/\s+/)
    .filter(word => /^[a-zA-Z]{3,}$/.test(word))
    .join(' ');
    
  if (letterOnlyWords.length > 100) {
    return letterOnlyWords;
  }
  
  return cleaned;
}
