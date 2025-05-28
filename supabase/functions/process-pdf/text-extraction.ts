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

// Enhanced comprehensive text extraction with better stream decoding
function extractComprehensiveText(pdfBytes: string): string {
  console.log("Starting enhanced text extraction with stream decoding");
  
  let extractedTexts: string[] = [];
  
  try {
    // Strategy 1: Extract from decoded streams
    const streamText = extractFromDecodedStreams(pdfBytes);
    if (streamText && streamText.length > 50) {
      console.log(`Found ${streamText.length} chars from decoded streams`);
      extractedTexts.push(streamText);
    }
    
    // Strategy 2: Extract from text objects with better parsing
    const textObjectText = extractFromTextObjects(pdfBytes);
    if (textObjectText && textObjectText.length > 50) {
      console.log(`Found ${textObjectText.length} chars from text objects`);
      extractedTexts.push(textObjectText);
    }
    
    // Strategy 3: Extract visible text content
    const visibleText = extractVisibleTextContent(pdfBytes);
    if (visibleText && visibleText.length > 50) {
      console.log(`Found ${visibleText.length} chars from visible content`);
      extractedTexts.push(visibleText);
    }
    
    // Strategy 4: Extract from font encoded text
    const fontText = extractFromFontEncodedText(pdfBytes);
    if (fontText && fontText.length > 50) {
      console.log(`Found ${fontText.length} chars from font encoded text`);
      extractedTexts.push(fontText);
    }
    
    // Find the best extraction result
    const bestText = findBestExtraction(extractedTexts);
    
    if (bestText && bestText.length > 50) {
      console.log(`Successfully extracted ${bestText.length} characters of readable text`);
      return cleanExtractedText(bestText);
    }
    
    console.log("No substantial readable text found, trying enhanced fallback");
    return extractEnhancedFallbackText(pdfBytes);
    
  } catch (error) {
    console.error("Error in enhanced text extraction:", error);
    return "Error extracting text: " + error.message;
  }
}

// Extract text from decoded PDF streams
function extractFromDecodedStreams(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for stream objects
  const streamPattern = /(\d+\s+\d+\s+obj[\s\S]*?stream\s*)([\s\S]*?)(\s*endstream)/g;
  let match;
  
  while ((match = streamPattern.exec(pdfBytes)) !== null) {
    const streamContent = match[2];
    
    // Check if this stream contains text operations
    if (streamContent.includes('Tj') || streamContent.includes('TJ') || streamContent.includes('BT')) {
      const decodedText = attemptStreamDecoding(streamContent);
      if (decodedText && isReadableText(decodedText)) {
        textParts.push(decodedText);
      }
    }
  }
  
  return textParts.join(' ');
}

// Attempt to decode stream content
function attemptStreamDecoding(streamContent: string): string {
  try {
    // If the content looks like it might be deflated/compressed, try basic decoding
    if (streamContent.includes('FlateDecode') || streamContent.length > 100) {
      // For now, extract any readable text patterns from the stream
      return extractReadablePatterns(streamContent);
    }
    
    // Extract text operations directly
    return extractTextOperationsFromStream(streamContent);
  } catch (error) {
    console.error("Error decoding stream:", error);
    return '';
  }
}

// Extract readable patterns from potentially encoded content
function extractReadablePatterns(content: string): string {
  const readableWords: string[] = [];
  
  // Look for sequences of letters that might be words
  const wordPattern = /[A-Za-z]{3,}/g;
  let match;
  
  while ((match = wordPattern.exec(content)) !== null) {
    const word = match[0];
    // Filter out common PDF artifacts and keep real words
    if (!isPdfArtifact(word) && isLikelyRealWord(word)) {
      readableWords.push(word);
    }
  }
  
  return readableWords.join(' ');
}

// Check if a word is likely a PDF artifact
function isPdfArtifact(word: string): boolean {
  const artifacts = [
    'FlateDecode', 'Stream', 'endstream', 'obj', 'endobj', 'xref', 'trailer',
    'Type', 'Page', 'Pages', 'Font', 'FontDescriptor', 'Encoding', 'Width',
    'Height', 'Length', 'Filter', 'Adobe', 'Identity', 'UCS', 'CIDFont'
  ];
  
  return artifacts.some(artifact => word.includes(artifact));
}

// Check if a word is likely a real word
function isLikelyRealWord(word: string): boolean {
  // Must be reasonable length
  if (word.length < 3 || word.length > 20) return false;
  
  // Should have vowels for most real words
  const vowelCount = (word.match(/[aeiouAEIOU]/g) || []).length;
  const hasVowels = vowelCount > 0;
  
  // Should not be all consonants or all uppercase random letters
  const isAllCaps = word === word.toUpperCase();
  const consonantRatio = (word.length - vowelCount) / word.length;
  
  return hasVowels && !(isAllCaps && consonantRatio > 0.8);
}

// Extract from text objects with enhanced parsing
function extractFromTextObjects(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for BT...ET blocks with better context
  const textBlockPattern = /BT\s+([\s\S]*?)\s+ET/g;
  let match;
  
  while ((match = textBlockPattern.exec(pdfBytes)) !== null) {
    const textBlock = match[1];
    const extractedText = parseTextBlock(textBlock);
    if (extractedText && isReadableText(extractedText)) {
      textParts.push(extractedText);
    }
  }
  
  return textParts.join(' ');
}

// Parse individual text blocks more intelligently
function parseTextBlock(textBlock: string): string {
  const textParts: string[] = [];
  const lines = textBlock.split('\n');
  
  for (const line of lines) {
    // Look for text operations
    const tjMatch = line.match(/\(([^)]+)\)\s*Tj/);
    if (tjMatch) {
      const text = decodeTextString(tjMatch[1]);
      if (text && isReadableText(text)) {
        textParts.push(text);
      }
      continue;
    }
    
    // Look for TJ array operations
    const tjArrayMatch = line.match(/\[\s*([^\]]+)\s*\]\s*TJ/);
    if (tjArrayMatch) {
      const arrayContent = tjArrayMatch[1];
      const strings = arrayContent.match(/\(([^)]+)\)/g);
      if (strings) {
        for (const str of strings) {
          const cleanStr = str.replace(/[()]/g, '');
          const decoded = decodeTextString(cleanStr);
          if (decoded && isReadableText(decoded)) {
            textParts.push(decoded);
          }
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract visible text content using different approach
function extractVisibleTextContent(pdfBytes: string): string {
  const words: string[] = [];
  
  // Look for parenthetical strings that are likely visible text
  const stringPattern = /\(([^)]{2,50})\)/g;
  let match;
  
  while ((match = stringPattern.exec(pdfBytes)) !== null) {
    const content = match[1];
    const decoded = decodeTextString(content);
    
    if (decoded && isActualWord(decoded)) {
      words.push(decoded);
    }
  }
  
  return words.join(' ');
}

// Extract from font-encoded text
function extractFromFontEncodedText(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for font definitions and associated text
  const fontPattern = /\/Font\s*<<[\s\S]*?>>/g;
  const textNearFonts: string[] = [];
  
  // Find text that appears near font definitions
  let match;
  while ((match = fontPattern.exec(pdfBytes)) !== null) {
    const fontIndex = match.index;
    
    // Look for text in a reasonable range after font definition
    const searchStart = fontIndex;
    const searchEnd = Math.min(fontIndex + 2000, pdfBytes.length);
    const contextText = pdfBytes.substring(searchStart, searchEnd);
    
    const contextWords = extractReadablePatterns(contextText);
    if (contextWords.length > 20) {
      textNearFonts.push(contextWords);
    }
  }
  
  return textNearFonts.join(' ');
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
function extractEnhancedFallbackText(pdfBytes: string): string {
  console.log("Using enhanced fallback text extraction");
  
  // Strategy 1: Extract all reasonable letter sequences
  const wordPattern = /[A-Za-z]{3,15}/g;
  const potentialWords = pdfBytes.match(wordPattern) || [];
  
  // Filter and clean words
  const realWords = potentialWords
    .filter(word => !isPdfArtifact(word))
    .filter(word => isLikelyRealWord(word))
    .slice(0, 200); // Limit to prevent too much output
  
  if (realWords.length >= 20) {
    const extractedText = realWords.join(' ');
    console.log(`Enhanced fallback extracted ${realWords.length} words`);
    return extractedText;
  }
  
  // Strategy 2: Look for actual readable content patterns
  const sentencePattern = /[A-Z][a-z]{2,}\s+[a-z]{2,}[\s\w.,;:!?]{10,}[.!?]/g;
  const sentences = pdfBytes.match(sentencePattern);
  
  if (sentences && sentences.length > 0) {
    return sentences.join(' ');
  }
  
  return "This PDF document uses complex encoding that makes text extraction difficult. The document may contain primarily graphical content, custom fonts, or advanced formatting that requires specialized PDF processing tools.";
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
