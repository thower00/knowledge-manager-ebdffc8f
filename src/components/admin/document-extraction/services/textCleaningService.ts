
/**
 * Enhanced text cleaning function for PDF.js extracted text
 * Focuses on cleaning properly extracted text rather than fixing extraction issues
 */
export function cleanAndNormalizeText(text: string): string {
  if (!text || text.length === 0) return "";
  
  console.log("Cleaning PDF.js extracted text for better readability...");
  
  try {
    // Since we now use PDF.js, the text should already be properly extracted
    // We just need to clean up formatting and spacing issues
    
    const cleanedText = text
      // Normalize whitespace but preserve paragraph breaks
      .replace(/[ \t]+/g, ' ')                               // Multiple spaces/tabs to single space
      .replace(/\n\s*\n\s*\n/g, '\n\n')                     // Multiple line breaks to double
      .replace(/([.!?])\s*\n\s*([A-Z])/g, '$1\n\n$2')       // Add paragraph breaks after sentences
      .trim();
    
    // If the text looks properly formatted, return it
    if (cleanedText.length > 100 && /[a-zA-Z]{3,}/.test(cleanedText)) {
      console.log("Text appears to be properly extracted and formatted");
      return cleanedText;
    }
    
    // If text is very short or seems problematic, provide a helpful message
    if (cleanedText.length < 50) {
      console.log("Extracted text is very short, might be an issue with the PDF");
      return cleanedText.length > 0 ? cleanedText : 
        "Very little text was extracted. The PDF may contain mostly images or have accessibility issues.";
    }
    
    return cleanedText;
    
  } catch (error) {
    console.error("Error during text cleaning:", error);
    return text; // Return original text if cleaning fails
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
 * Simple text validation for PDF.js extracted content
 */
export function validateExtractedText(text: string): { isValid: boolean; message?: string } {
  if (!text || text.trim().length === 0) {
    return { isValid: false, message: "No text was extracted from the PDF" };
  }
  
  if (text.length < 20) {
    return { isValid: false, message: "Very little text was extracted - PDF may be image-based" };
  }
  
  // Check for proper word structure
  const words = text.split(/\s+/).filter(word => /[a-zA-Z]{2,}/.test(word));
  if (words.length < 5) {
    return { isValid: false, message: "Extracted text doesn't contain enough readable words" };
  }
  
  return { isValid: true };
}

/**
 * Format extracted text with proper structure
 */
export function formatExtractedText(text: string, metadata?: any): string {
  let formatted = text;
  
  // Add metadata header if provided
  if (metadata) {
    let header = '';
    if (metadata.fileType) {
      header += `Document Type: ${metadata.fileType.toUpperCase()}\n`;
    }
    if (metadata.pages) {
      header += `Pages: ${metadata.pages}\n`;
    }
    if (metadata.size) {
      header += `Size: ${(metadata.size / 1024).toFixed(1)} KB\n`;
    }
    if (header) {
      header += '\n--- Extracted Text ---\n\n';
      formatted = header + formatted;
    }
  }
  
  return formatted;
}
