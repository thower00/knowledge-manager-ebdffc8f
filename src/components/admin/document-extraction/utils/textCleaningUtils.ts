/**
 * Advanced text cleaning utilities for PDF documents
 * Specifically designed to handle problematic binary data and encoding issues
 */

/**
 * Aggressively clean and normalize PDF text to ensure readability
 * Uses multiple strategies to handle various PDF encoding issues
 */
export function cleanPdfText(text: string): string {
  if (!text || text.length === 0) return "";
  
  console.log("Running aggressive PDF text cleaning");
  console.log(`Original text length: ${text.length}`);
  
  // Keep original text for fallback
  const originalText = text;
  
  try {
    // First pass: Basic cleaning of control characters
    const cleanedText = text
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')  // Control chars
      .replace(/[^\x20-\x7E\r\n\t\u00A0-\u00FF\u2000-\u206F]/g, ' ')  // Keep printable ASCII, Latin-1 and punctuation
      .replace(/\uFFFD/g, ' ')  // Replace Unicode replacement char
      .trim();
    
    // Check if this basic cleaning yielded good results
    if (containsEnoughReadableWords(cleanedText) && cleanedText.length > 200) {
      console.log(`Basic cleaning successful, found readable text (${cleanedText.length} chars)`);
      return cleanedText;
    }
    
    // Second pass: Extract words with letters (more aggressive)
    const words = originalText.split(/\s+/)
      .filter(word => /[a-zA-Z]{2,}/.test(word) && word.length >= 3)
      .join(' ');
      
    if (words.length > 200) {
      console.log(`Word extraction successful (${words.length} chars)`);
      return words;
    }
    
    // Third pass: Ultra aggressive - keep only actual words and numbers
    const letterOnlyWords = originalText.split(/\s+/)
      .filter(word => /^[a-zA-Z]{3,}$/.test(word))
      .join(' ');
      
    if (letterOnlyWords.length > 100) {
      console.log(`Letter-only word extraction successful (${letterOnlyWords.length} chars)`);
      return letterOnlyWords;
    }
    
    // Fourth pass: Extract complete sentences as last resort
    const sentencePattern = /[A-Z][^.!?]+[.!?]/g;
    const sentences = originalText.match(sentencePattern);
    if (sentences && sentences.length > 0) {
      const sentenceText = sentences.join(' ');
      if (sentenceText.length > 100) {
        console.log(`Sentence extraction successful (${sentenceText.length} chars)`);
        return sentenceText;
      }
    }
    
    // If all else fails, use a pattern-based approach
    return extractTextPatterns(originalText);
  } catch (error) {
    console.error("Error during text cleaning:", error);
    
    // Last resort - try to extract anything readable
    return extractTextPatterns(originalText);
  }
}

/**
 * Extract text using various patterns to find readable content
 */
function extractTextPatterns(text: string): string {
  try {
    // Look for patterns that might contain actual text
    const patterns = [
      // Words with multiple letters
      /([A-Za-z]{3,}[\s.,;:!?]*){3,}/g,
      
      // Capitalized words (likely proper nouns or sentence starts)
      /([A-Z][a-z]{2,}[\s.,;:!?]*){2,}/g,
      
      // Common sentence structures
      /([A-Z][a-z]+[\s][a-z]+[\s][a-z]+[\s.,;:!?])/g
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const extractedText = matches.join(' ').replace(/\s+/g, ' ').trim();
        if (extractedText.length > 100) {
          console.log(`Pattern extraction successful (${extractedText.length} chars)`);
          return extractedText;
        }
      }
    }
    
    // If we got here, we couldn't extract good text
    console.log("Could not extract readable text using patterns");
    return "Could not extract readable text from this document. The document appears to contain binary data or have encoding issues.";
  } catch (error) {
    console.error("Error in pattern extraction:", error);
    return "Error cleaning text. The document may be corrupted or in an unsupported format.";
  }
}

/**
 * Check if text contains enough readable words to be considered valid
 */
function containsEnoughReadableWords(text: string): boolean {
  // Count words with 3+ letters (likely actual words)
  const words = text.split(/\s+/).filter(word => /[a-zA-Z]{3,}/.test(word));
  
  // Consider text readable if it has enough words with letters
  const hasEnoughWords = words.length >= 10;
  const hasReasonableWordRatio = words.length >= text.length / 100;
  
  return hasEnoughWords && hasReasonableWordRatio;
}

/**
 * Detect if extracted text appears to be binary data
 */
export function isBinaryData(text: string): boolean {
  if (!text || text.length < 100) return false;
  
  // Check for indicators of binary content
  const suspiciousChars = text.replace(/[a-zA-Z0-9\s.,;:!?()\[\]{}'"$%&*+\-=<>|/\\]/g, '');
  const suspiciousRatio = suspiciousChars.length / text.length;
  
  const indicators = [
    // High percentage of non-standard characters
    suspiciousRatio > 0.2,
    
    // Low percentage of spaces (indicates not natural text)
    (text.match(/\s/g)?.length || 0) < text.length / 15,
    
    // Many unusual character sequences
    (/[&@#^~*\\\/]{2,}/g).test(text),
    
    // Contains common binary/hex indicators
    (/0x[0-9A-F]{2}/gi).test(text)
  ];
  
  // If more than one indicator is true, likely binary
  return indicators.filter(Boolean).length >= 2;
}

/**
 * Extract plain text from PDF text that might contain binary data
 */
export function extractPlainText(text: string): string {
  if (isBinaryData(text)) {
    return cleanPdfText(text);
  }
  return text;
}
