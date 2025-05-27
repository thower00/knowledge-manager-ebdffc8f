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
      const text = extractComprehensiveText(pdfBytes);
      clearTimeout(timeout);
      resolve(text);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Enhanced comprehensive text extraction
function extractComprehensiveText(pdfBytes: string): string {
  console.log("Starting comprehensive text extraction for complete document content");
  
  let extractedTexts: string[] = [];
  
  try {
    // Strategy 1: Extract from text streams with proper ordering
    const streamText = extractFromTextStreams(pdfBytes);
    if (streamText && streamText.length > 100) {
      console.log(`Found ${streamText.length} chars from text streams`);
      extractedTexts.push(streamText);
    }
    
    // Strategy 2: Extract from BT/ET text blocks with better parsing
    const textBlockText = extractFromTextBlocks(pdfBytes);
    if (textBlockText && textBlockText.length > 100) {
      console.log(`Found ${textBlockText.length} chars from text blocks`);
      extractedTexts.push(textBlockText);
    }
    
    // Strategy 3: Extract from content streams
    const contentText = extractFromContentStreams(pdfBytes);
    if (contentText && contentText.length > 100) {
      console.log(`Found ${contentText.length} chars from content streams`);
      extractedTexts.push(contentText);
    }
    
    // Strategy 4: Look for actual words in string literals
    const literalText = extractWordsFromLiterals(pdfBytes);
    if (literalText && literalText.length > 100) {
      console.log(`Found ${literalText.length} chars from string literals`);
      extractedTexts.push(literalText);
    }
    
    // Combine and clean the best result
    const bestText = findBestExtraction(extractedTexts);
    
    if (bestText && bestText.length > 50) {
      console.log(`Successfully extracted ${bestText.length} characters of readable text`);
      return cleanExtractedText(bestText);
    }
    
    console.log("No substantial text found, trying fallback extraction");
    return extractFallbackText(pdfBytes);
    
  } catch (error) {
    console.error("Error in comprehensive text extraction:", error);
    return "Error extracting text: " + error.message;
  }
}

// Extract text from PDF text streams
function extractFromTextStreams(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for stream objects that contain text
  const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
  let match;
  
  while ((match = streamPattern.exec(pdfBytes)) !== null) {
    const streamContent = match[1];
    
    // Look for text operations within streams
    const textOperations = extractTextOperationsFromStream(streamContent);
    if (textOperations.length > 0) {
      textParts.push(...textOperations);
    }
  }
  
  return textParts.join(' ');
}

// Extract text operations from a stream
function extractTextOperationsFromStream(streamContent: string): string[] {
  const textParts: string[] = [];
  
  // Look for Tj operations: (text)Tj
  const tjPattern = /\(([^)]+)\)\s*Tj/g;
  let match;
  
  while ((match = tjPattern.exec(streamContent)) !== null) {
    const decodedText = decodeTextString(match[1]);
    if (decodedText && isReadableText(decodedText)) {
      textParts.push(decodedText);
    }
  }
  
  // Look for TJ array operations
  const tjArrayPattern = /\[\s*([^\]]+)\s*\]\s*TJ/g;
  while ((match = tjArrayPattern.exec(streamContent)) !== null) {
    const arrayContent = match[1];
    
    // Extract strings from the array
    const stringPattern = /\(([^)]+)\)/g;
    let stringMatch;
    
    while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
      const decodedText = decodeTextString(stringMatch[1]);
      if (decodedText && isReadableText(decodedText)) {
        textParts.push(decodedText);
      }
    }
  }
  
  return textParts;
}

// Extract from BT/ET text blocks with better parsing
function extractFromTextBlocks(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Find all BT...ET text blocks
  const textBlockPattern = /BT\s+([\s\S]*?)\s+ET/g;
  let match;
  
  while ((match = textBlockPattern.exec(pdfBytes)) !== null) {
    const textBlock = match[1];
    
    // Look for positioning and text operations
    const lines = textBlock.split('\n');
    let currentText = '';
    
    for (const line of lines) {
      // Look for text operations
      const tjMatch = line.match(/\(([^)]+)\)\s*Tj/);
      if (tjMatch) {
        const text = decodeTextString(tjMatch[1]);
        if (text && isReadableText(text)) {
          currentText += text + ' ';
        }
      }
      
      // Look for text positioning that might indicate new lines
      if (line.includes('Td') || line.includes('TD')) {
        if (currentText.trim()) {
          textParts.push(currentText.trim());
          currentText = '';
        }
      }
    }
    
    if (currentText.trim()) {
      textParts.push(currentText.trim());
    }
  }
  
  return textParts.join(' ');
}

// Extract from content streams
function extractFromContentStreams(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for content stream references and extract text
  const contentPattern = /\/Contents\s+(\d+)\s+\d+\s+R/g;
  let match;
  
  while ((match = contentPattern.exec(pdfBytes)) !== null) {
    // This is a simplified approach - in a real implementation,
    // we'd need to follow the object references
    
    // For now, look for nearby text content
    const contextStart = Math.max(0, match.index - 1000);
    const contextEnd = Math.min(pdfBytes.length, match.index + 2000);
    const context = pdfBytes.substring(contextStart, contextEnd);
    
    const contextText = extractTextOperationsFromStream(context);
    textParts.push(...contextText);
  }
  
  return textParts.join(' ');
}

// Extract actual words from string literals
function extractWordsFromLiterals(pdfBytes: string): string {
  const words: string[] = [];
  
  // Look for parenthetical strings that contain actual words
  const stringPattern = /\(([^)]{2,})\)/g;
  let match;
  
  while ((match = stringPattern.exec(pdfBytes)) !== null) {
    const text = decodeTextString(match[1]);
    if (text && isActualWord(text)) {
      words.push(text);
    }
  }
  
  return words.join(' ');
}

// Find the best extraction result
function findBestExtraction(extractions: string[]): string {
  if (extractions.length === 0) return '';
  
  // Score each extraction based on readability
  let bestScore = 0;
  let bestText = '';
  
  for (const text of extractions) {
    const score = scoreTextReadability(text);
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }
  
  return bestText;
}

// Score text readability
function scoreTextReadability(text: string): number {
  if (!text || text.length < 10) return 0;
  
  let score = 0;
  
  // Count actual words
  const words = text.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word));
  score += words.length * 10;
  
  // Penalize single characters
  const singleChars = text.split(/\s+/).filter(word => word.length === 1);
  score -= singleChars.length * 5;
  
  // Reward longer coherent text
  if (text.length > 200) score += 50;
  if (text.length > 500) score += 100;
  
  // Reward sentence-like structures
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  score += sentences.length * 20;
  
  return score;
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

// Check if text is readable
function isReadableText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Must contain at least some letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  return letterCount >= Math.min(text.length * 0.3, 2);
}

// Check if text is an actual word
function isActualWord(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Clean the text
  const cleaned = text.trim();
  
  // Must be mostly letters and reasonable length
  const isWord = /^[a-zA-Z][a-zA-Z\s'-]{1,50}[a-zA-Z]$/.test(cleaned) ||
                 /^[a-zA-Z]{2,20}$/.test(cleaned);
  
  return isWord;
}

// Clean the final extracted text
function cleanExtractedText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove obvious PDF artifacts
  cleaned = cleaned.replace(/\b(endobj|obj|stream|endstream|xref|trailer|BT|ET|Tj|TJ)\b/g, '');
  
  // Remove isolated single characters that are likely artifacts
  cleaned = cleaned.replace(/\b[a-zA-Z]\b(?=\s)/g, '');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Fallback extraction for difficult PDFs
function extractFallbackText(pdfBytes: string): string {
  console.log("Using fallback text extraction");
  
  // Look for any sequences that might be readable text
  const wordPattern = /[A-Za-z]{3,}/g;
  const potentialWords = pdfBytes.match(wordPattern) || [];
  
  // Filter out PDF keywords and keep real words
  const pdfKeywords = ['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'Font', 'Type', 'Subtype', 'Length', 'Filter'];
  const realWords = potentialWords.filter(word => 
    !pdfKeywords.includes(word) && 
    word.length >= 3 && 
    /^[A-Za-z]+$/.test(word)
  );
  
  if (realWords.length >= 10) {
    return realWords.slice(0, 100).join(' ');
  }
  
  return "This PDF document uses advanced formatting that makes text extraction challenging. The document may contain primarily graphical content or use complex encoding.";
}

// Enhanced text cleaning for binary-contaminated PDFs
export function cleanAndNormalizeText(text: string): string {
  return cleanExtractedText(text);
}

// Additional utility functions for backward compatibility
export function extractTextByLineBreaks(text: string): string {
  return extractWordsFromLiterals(text);
}

export function extractTextPatterns(text: string): string {
  return extractWordsFromLiterals(text);
}

export function extractTextFromParentheses(text: string): string {
  return extractWordsFromLiterals(text);
}

export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
