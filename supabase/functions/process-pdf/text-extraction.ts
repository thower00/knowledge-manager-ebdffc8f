
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
      const text = extractTextFromPdfBytes(pdfBytes);
      clearTimeout(timeout);
      resolve(text);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Main text extraction function
function extractTextFromPdfBytes(pdfBytes: string): string {
  let text = '';
  
  // Look for text objects in the PDF
  const textMatches = pdfBytes.match(/\((.*?)\)\s*Tj/g);
  if (textMatches) {
    for (const match of textMatches) {
      const content = match.match(/\((.*?)\)/)?.[1];
      if (content) {
        text += content + ' ';
      }
    }
  }
  
  // Look for alternative text patterns
  const altTextMatches = pdfBytes.match(/\[(.*?)\]\s*TJ/g);
  if (altTextMatches) {
    for (const match of altTextMatches) {
      const content = match.match(/\[(.*?)\]/)?.[1];
      if (content) {
        // Remove escape characters and formatting
        const cleanContent = content.replace(/\\[nrt]/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
        text += cleanContent + ' ';
      }
    }
  }
  
  return text.trim();
}

// Ultra-aggressive text cleaning for binary-contaminated PDFs
export function cleanAndNormalizeText(text: string): string {
  if (!text || text.length === 0) return "";
  
  console.log("Running ultra-aggressive text cleaning for binary-contaminated PDF");
  console.log(`Original text length: ${text.length}`);
  
  // Step 1: Extract readable words using multiple strategies
  const words = extractReadableWords(text);
  
  if (words.length > 50) {
    console.log(`Successfully extracted ${words.length} readable words`);
    return words.join(' ');
  }
  
  // Step 2: Try sentence extraction
  const sentences = extractReadableSentences(text);
  
  if (sentences.length > 10) {
    console.log(`Successfully extracted ${sentences.length} readable sentences`);
    return sentences.join(' ');
  }
  
  // Step 3: Extract any meaningful text patterns
  const meaningfulText = extractMeaningfulPatterns(text);
  
  if (meaningfulText.length > 20) {
    console.log(`Successfully extracted meaningful text patterns: ${meaningfulText.length} chars`);
    return meaningfulText;
  }
  
  console.log("Could not extract readable text from binary-contaminated PDF");
  return "Could not extract readable text from this PDF. The document appears to contain primarily binary data or encoded content.";
}

// Extract readable words from contaminated text
function extractReadableWords(text: string): string[] {
  const words: string[] = [];
  
  // Split by common separators and filter for actual words
  const tokens = text.split(/[\s\n\r\t\u0000-\u001F\u007F-\u009F\uFFFD]+/);
  
  for (const token of tokens) {
    // Look for words that are likely to be actual text
    if (isReadableWord(token)) {
      words.push(token);
    }
  }
  
  return words;
}

// Check if a token looks like a readable word
function isReadableWord(token: string): boolean {
  if (!token || token.length < 2) return false;
  
  // Must contain mostly letters
  const letterCount = (token.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / token.length;
  
  // Accept tokens that are mostly letters or common punctuation
  if (letterRatio >= 0.7 && token.length >= 2) {
    // Exclude tokens with too many special characters
    const specialChars = token.match(/[^\w\s.,;:!?()\-'"/]/g);
    const specialRatio = specialChars ? specialChars.length / token.length : 0;
    
    return specialRatio < 0.3;
  }
  
  return false;
}

// Extract readable sentences from contaminated text
function extractReadableSentences(text: string): string[] {
  const sentences: string[] = [];
  
  // Look for patterns that might be sentences
  const sentencePatterns = [
    /[A-Z][a-z]{2,}[^.!?]*[.!?]/g,  // Traditional sentences
    /[A-Z][a-z]+ [a-z]+ [a-z]+/g,   // Multiple words starting with capital
    /[a-zA-Z]{3,} [a-zA-Z]{3,} [a-zA-Z]{3,}/g // Three consecutive words
  ];
  
  for (const pattern of sentencePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (isReadableSentence(match)) {
          sentences.push(match.trim());
        }
      }
    }
  }
  
  return [...new Set(sentences)]; // Remove duplicates
}

// Check if text looks like a readable sentence
function isReadableSentence(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Must contain mostly letters and spaces
  const alphaSpaceCount = (text.match(/[a-zA-Z\s]/g) || []).length;
  const alphaSpaceRatio = alphaSpaceCount / text.length;
  
  return alphaSpaceRatio >= 0.8;
}

// Extract meaningful patterns from binary-contaminated text
function extractMeaningfulPatterns(text: string): string {
  const patterns: string[] = [];
  
  // Look for common document metadata patterns
  const metadataPatterns = [
    /[A-Z][a-z]+ [A-Z][a-z]+/g, // Names like "Thomas Wernerheim"
    /Microsoft [A-Z][a-z]+/g,    // Microsoft products
    /Adobe [A-Z][a-z]+/g,        // Adobe products
    /\b[A-Z][a-z]{2,}\.(docx?|pdf|txt)/g, // File names
    /\b[A-Z][a-z]{3,}[:\s][A-Z][a-z]+/g   // Labels and values
  ];
  
  for (const pattern of metadataPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      patterns.push(...matches);
    }
  }
  
  // Extract any remaining readable chunks
  const readableChunks = text.match(/[A-Za-z]{3,}(?:\s+[A-Za-z]{3,}){1,5}/g);
  if (readableChunks) {
    patterns.push(...readableChunks);
  }
  
  return [...new Set(patterns)].join(' ').trim();
}

// Clean and normalize extracted text
export function extractTextByLineBreaks(text: string): string {
  const cleanedWords = extractReadableWords(text);
  return cleanedWords.join(' ');
}

// Extract text using pattern matching
export function extractTextPatterns(text: string): string {
  return extractMeaningfulPatterns(text);
}

// Extract text from parentheses patterns
export function extractTextFromParentheses(text: string): string {
  const parenthesesMatches = text.match(/\([^)]+\)/g);
  if (!parenthesesMatches) return '';
  
  const readableWords: string[] = [];
  
  for (const match of parenthesesMatches) {
    const content = match.slice(1, -1); // Remove parentheses
    const words = extractReadableWords(content);
    readableWords.push(...words);
  }
  
  return readableWords.join(' ');
}

// Check if text contains binary indicators
export function textContainsBinaryIndicators(text: string): boolean {
  // Check for high ratio of non-printable characters
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\x9F]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  
  // Check for Unicode replacement characters
  const replacementChars = text.match(/\uFFFD/g);
  const replacementRatio = replacementChars ? replacementChars.length / text.length : 0;
  
  // Check for suspicious character sequences
  const suspiciousSequences = text.match(/[^\x20-\x7E\r\n\t]{3,}/g);
  const suspiciousRatio = suspiciousSequences ? suspiciousSequences.length : 0;
  
  return ratio > 0.05 || replacementRatio > 0.01 || suspiciousRatio > 2;
}
