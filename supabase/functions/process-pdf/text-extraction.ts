// Helper function to check if data looks like a PDF
export function isPdfData(data: string): boolean {
  return data.startsWith('%PDF-');
}

// Extract basic PDF metadata
export function extractPdfMetadata(pdfBytes: string) {
  const pageCount = (pdfBytes.match(/\/Type\s*\/Page\b/g) || []).length;
  return {
    pageCount: Math.max(pageCount, 1)
  };
}

// Extract text with timeout protection
export async function extractTextWithTimeout(pdfBytes: string, timeoutMs: number = 25000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Text extraction timed out'));
    }, timeoutMs);

    try {
      const text = extractActualReadableText(pdfBytes);
      clearTimeout(timeout);
      resolve(text);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Main function to extract actual readable text from PDF
function extractActualReadableText(pdfBytes: string): string {
  console.log("Starting enhanced text extraction focused on readable content");
  
  let extractedText = "";
  
  try {
    // Strategy 1: Look for actual text in BT/ET blocks with proper Tj/TJ operations
    const textFromOperations = extractFromTextOperations(pdfBytes);
    if (textFromOperations && textFromOperations.length > 50) {
      console.log(`Found ${textFromOperations.length} chars from text operations`);
      extractedText += textFromOperations + " ";
    }
    
    // Strategy 2: Extract from ToUnicode mappings if available
    const unicodeText = extractFromUnicodeMappings(pdfBytes);
    if (unicodeText && unicodeText.length > 50) {
      console.log(`Found ${unicodeText.length} chars from Unicode mappings`);
      extractedText += unicodeText + " ";
    }
    
    // Strategy 3: Look for string literals that contain actual words
    const literalText = extractReadableStringLiterals(pdfBytes);
    if (literalText && literalText.length > 50) {
      console.log(`Found ${literalText.length} chars from string literals`);
      extractedText += literalText + " ";
    }
    
    // Strategy 4: Extract from font character mappings
    const fontText = extractFromFontCharMappings(pdfBytes);
    if (fontText && fontText.length > 50) {
      console.log(`Found ${fontText.length} chars from font mappings`);
      extractedText += fontText + " ";
    }
    
    // Clean and validate the result
    if (extractedText.trim().length > 0) {
      const cleanText = cleanAndValidateText(extractedText);
      if (isActualReadableText(cleanText)) {
        console.log(`Successfully extracted ${cleanText.length} characters of readable text`);
        return cleanText;
      }
    }
    
    console.log("No readable text found, trying fallback methods");
    return tryAdvancedFallback(pdfBytes);
    
  } catch (error) {
    console.error("Error in text extraction:", error);
    return "Error extracting text: " + error.message;
  }
}

// Extract text from PDF text operations (Tj/TJ commands)
function extractFromTextOperations(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Find all BT...ET text blocks
  const textBlockPattern = /BT\s+([\s\S]*?)\s+ET/g;
  let match;
  
  while ((match = textBlockPattern.exec(pdfBytes)) !== null) {
    const textBlock = match[1];
    
    // Extract Tj operations: (text)Tj
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    
    while ((tjMatch = tjPattern.exec(textBlock)) !== null) {
      const text = decodeTextString(tjMatch[1]);
      if (text && isWordLike(text)) {
        textParts.push(text);
      }
    }
    
    // Extract TJ array operations: [(text1) num (text2) ...]TJ
    const tjArrayPattern = /\[\s*([^\]]*)\s*\]\s*TJ/g;
    while ((tjMatch = tjArrayPattern.exec(textBlock)) !== null) {
      const arrayContent = tjMatch[1];
      
      // Extract strings from the array
      const stringPattern = /\(([^)]*)\)/g;
      let stringMatch;
      
      while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
        const text = decodeTextString(stringMatch[1]);
        if (text && isWordLike(text)) {
          textParts.push(text);
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract text from ToUnicode character mappings
function extractFromUnicodeMappings(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for ToUnicode CMap data
  const toUnicodePattern = /\/ToUnicode\s+\d+\s+\d+\s+R/g;
  const cmapPattern = /beginbfchar\s*([\s\S]*?)\s*endbfchar/g;
  
  let match;
  while ((match = cmapPattern.exec(pdfBytes)) !== null) {
    const mappingData = match[1];
    
    // Parse character mappings: <srccode> <unicode>
    const mappingPattern = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let mappingMatch;
    
    while ((mappingMatch = mappingPattern.exec(mappingData)) !== null) {
      const unicodeHex = mappingMatch[2];
      
      try {
        // Convert Unicode hex to character
        if (unicodeHex.length === 4) {
          const charCode = parseInt(unicodeHex, 16);
          if (charCode >= 32 && charCode <= 126) {
            const char = String.fromCharCode(charCode);
            if (isWordCharacter(char)) {
              textParts.push(char);
            }
          }
        }
      } catch (e) {
        // Skip invalid mappings
      }
    }
  }
  
  return textParts.join('');
}

// Extract readable string literals
function extractReadableStringLiterals(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Match parenthetical strings that might contain text
  const stringPattern = /\(([^)]{3,})\)/g;
  let match;
  
  while ((match = stringPattern.exec(pdfBytes)) !== null) {
    const text = decodeTextString(match[1]);
    if (text && isActualWord(text)) {
      textParts.push(text);
    }
  }
  
  return textParts.join(' ');
}

// Extract from font character mappings
function extractFromFontCharMappings(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for character code mappings in font definitions
  const bfcharPattern = /beginbfchar\s*([\s\S]*?)\s*endbfchar/g;
  let match;
  
  while ((match = bfcharPattern.exec(pdfBytes)) !== null) {
    const mappingContent = match[1];
    
    // Parse mappings and try to extract readable characters
    const lines = mappingContent.split('\n');
    for (const line of lines) {
      const mappingMatch = line.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
      if (mappingMatch) {
        const targetHex = mappingMatch[2];
        
        try {
          if (targetHex.length === 4) {
            const charCode = parseInt(targetHex, 16);
            if (charCode >= 32 && charCode <= 126) {
              textParts.push(String.fromCharCode(charCode));
            }
          }
        } catch (e) {
          // Skip invalid mappings
        }
      }
    }
  }
  
  return textParts.join('');
}

// Decode text strings with proper escape handling
function decodeTextString(text: string): string {
  if (!text) return '';
  
  // Handle common PDF escape sequences
  let decoded = text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{3})/g, (match, octal) => {
      const charCode = parseInt(octal, 8);
      return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : ' ';
    });
  
  return decoded;
}

// Check if text looks like a word
function isWordLike(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(text)) return false;
  
  // Should not be mostly non-letter characters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  return letterCount >= text.length * 0.5;
}

// Check if text is an actual word
function isActualWord(text: string): boolean {
  if (!text || text.length < 3) return false;
  
  // Must be mostly letters
  const letterPattern = /^[a-zA-Z][a-zA-Z0-9\s.,;:!?-]*[a-zA-Z0-9]$/;
  return letterPattern.test(text.trim());
}

// Check if character is a word character
function isWordCharacter(char: string): boolean {
  return /[a-zA-Z0-9\s.,;:!?-]/.test(char);
}

// Clean and validate the final text
function cleanAndValidateText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove non-printable characters except common punctuation
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, ' ');
  
  // Remove PDF artifacts
  cleaned = cleaned.replace(/\b(endobj|obj|stream|endstream|xref|trailer)\b/g, '');
  
  // Clean up multiple spaces again
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Check if text is actually readable
function isActualReadableText(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Count actual words (sequences of letters)
  const words = text.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word));
  
  // Must have at least 3 real words
  return words.length >= 3;
}

// Advanced fallback for difficult PDFs
function tryAdvancedFallback(pdfBytes: string): string {
  console.log("Attempting advanced fallback extraction");
  
  // Try to find any sequences that look like actual words
  const wordPattern = /\b[A-Za-z]{3,}\b/g;
  const potentialWords = pdfBytes.match(wordPattern) || [];
  
  // Filter out PDF keywords and keep only real-looking words
  const pdfKeywords = ['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'Font', 'Type', 'Subtype'];
  const realWords = potentialWords.filter(word => 
    !pdfKeywords.includes(word) && 
    word.length >= 3 && 
    /^[A-Za-z]+$/.test(word)
  );
  
  if (realWords.length >= 5) {
    return realWords.slice(0, 50).join(' ');
  }
  
  return "This PDF document appears to use advanced encoding or compression that prevents text extraction. The document may need to be processed with specialized OCR tools.";
}

// Enhanced text cleaning for binary-contaminated PDFs
export function cleanAndNormalizeText(text: string): string {
  return cleanAndValidateText(text);
}

// Additional utility functions for backward compatibility
export function extractTextByLineBreaks(text: string): string {
  return extractReadableStringLiterals(text);
}

export function extractTextPatterns(text: string): string {
  return extractReadableStringLiterals(text);
}

export function extractTextFromParentheses(text: string): string {
  return extractReadableStringLiterals(text);
}

export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
