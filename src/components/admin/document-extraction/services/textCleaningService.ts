/**
 * Enhanced text cleaning function to ensure we get readable text, not binary
 * Uses multiple strategies to clean text and prevent binary data display
 */
export function cleanAndNormalizeText(text: string): string {
  if (!text || text.length === 0) return "";
  
  console.log("Running enhanced text cleaning for readability...");
  
  // Keep original text for comparison
  const originalText = text;
  
  try {
    // Basic cleaning first - Remove most problematic characters
    let cleanedText = text
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ') // Remove control chars
      .replace(/\uFFFD/g, ' ')                                // Replace replacement char
      .trim();
    
    // If this basic cleaning yields good results, use it
    if (containsReadableText(cleanedText) && cleanedText.length > 300) {
      console.log("Basic cleaning produced readable text");
      return cleanedText;
    }
    
    // More aggressive approach - keep only ASCII and basic punctuation
    cleanedText = text
      .replace(/[^\x20-\x7E\r\n\t\u00A0-\u00FF]/g, ' ')     // Keep only ASCII and Latin-1
      .replace(/\s+/g, ' ')                                 // Collapse whitespace
      .trim();
      
    if (containsReadableText(cleanedText) && cleanedText.length > 200) {
      console.log("Aggressive cleaning produced readable text");
      return cleanedText;
    }
    
    // Extract words with letters if previous methods didn't work well
    const words = originalText.split(/\s+/)
      .filter(word => /[a-zA-Z]{2,}/.test(word) && word.length >= 2)
      .join(' ');
      
    if (words.length > 200) {
      console.log("Word extraction produced readable text");
      return words;
    }
    
    // Page pattern extraction (look for "--- Page X ---" patterns)
    const pagePatterns = originalText.match(/--- Page \d+ ---[\s\S]*?(?=--- Page \d+ ---|$)/g);
    if (pagePatterns && pagePatterns.length > 0) {
      const cleanedPages = pagePatterns
        .map(page => {
          const pageTitle = page.match(/--- Page \d+ ---/) || ["Page"];
          const cleanContent = page
            .replace(/--- Page \d+ ---/, '')
            .replace(/[^\x20-\x7E\r\n\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          return `${pageTitle[0]}\n${cleanContent}`;
        })
        .join('\n\n');
      
      if (cleanedPages.length > 200) {
        console.log("Page pattern extraction produced readable text");
        return cleanedPages;
      }
    }
    
    // Last resort - extra aggressive cleaning
    const ultraClean = originalText
      .replace(/[^a-zA-Z0-9\s.,;:!?()\[\]{}'"$%&*+\-=<>|/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return ultraClean.length > 100 ? ultraClean : 
      "Could not extract readable text from this document. The document may contain only images or be protected.";
  } catch (error) {
    console.error("Error during text cleaning:", error);
    return "Error cleaning text. The document may contain content that cannot be properly displayed.";
  }
}

/**
 * Check if text appears to contain readable content
 */
function containsReadableText(text: string): boolean {
  // Check if text contains at least some words with 3+ letters
  const words = text.split(/\s+/).filter(word => /[a-zA-Z]{3,}/.test(word));
  
  // Consider text readable if it has enough words with letters
  return words.length >= 10 && words.length >= text.length / 50;
}

/**
 * Alternative text extraction strategies for challenging PDFs
 */
export function extractTextAlternatives(text: string): string[] {
  const results = [];
  
  // Strategy 1: Extract text between quotes
  const quotedText = text.match(/"([^"]+)"/g);
  if (quotedText && quotedText.length > 5) {
    results.push(quotedText.join(' ')
      .replace(/"/g, '')
      .replace(/\s+/g, ' ')
      .trim());
  }
  
  // Strategy 2: Focus on alphabetic characters in clusters
  const alphaPattern = /[a-zA-Z]{3,}[a-zA-Z\s.,;:!?]{10,}/g;
  const alphaMatches = text.match(alphaPattern);
  if (alphaMatches && alphaMatches.length > 0) {
    results.push(alphaMatches.join(' ').trim());
  }
  
  return results;
}
