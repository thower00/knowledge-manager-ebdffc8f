
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

// Main extraction function focused on actual readable content
function extractActualReadableText(pdfBytes: string): string {
  console.log("Starting focused extraction for actual readable text content");
  
  let bestText = "";
  let bestScore = 0;
  
  try {
    // Strategy 1: Extract from parenthetical strings (most reliable)
    const parentheticalText = extractFromParentheticalStrings(pdfBytes);
    const parentheticalScore = scoreTextQuality(parentheticalText);
    if (parentheticalScore > bestScore) {
      bestText = parentheticalText;
      bestScore = parentheticalScore;
      console.log(`Parenthetical extraction scored ${parentheticalScore}: ${parentheticalText.substring(0, 100)}...`);
    }
    
    // Strategy 2: Extract from text showing operations
    const textShowingText = extractFromTextShowingOperations(pdfBytes);
    const textShowingScore = scoreTextQuality(textShowingText);
    if (textShowingScore > bestScore) {
      bestText = textShowingText;
      bestScore = textShowingScore;
      console.log(`Text showing extraction scored ${textShowingScore}: ${textShowingText.substring(0, 100)}...`);
    }
    
    // Strategy 3: Extract from decoded content streams
    const streamText = extractFromContentStreams(pdfBytes);
    const streamScore = scoreTextQuality(streamText);
    if (streamScore > bestScore) {
      bestText = streamText;
      bestScore = streamScore;
      console.log(`Stream extraction scored ${streamScore}: ${streamText.substring(0, 100)}...`);
    }
    
    // Strategy 4: Extract readable words from anywhere in the PDF
    const wordText = extractReadableWords(pdfBytes);
    const wordScore = scoreTextQuality(wordText);
    if (wordScore > bestScore) {
      bestText = wordText;
      bestScore = wordScore;
      console.log(`Word extraction scored ${wordScore}: ${wordText.substring(0, 100)}...`);
    }
    
    // If we found good text, clean and return it
    if (bestText && bestScore > 20) {
      const cleanedText = cleanExtractedText(bestText);
      console.log(`Successfully extracted readable text (score: ${bestScore}): ${cleanedText.length} characters`);
      return cleanedText;
    }
    
    // Fallback for difficult PDFs
    console.log("No high-quality text found, using fallback extraction");
    return extractFallbackText(pdfBytes);
    
  } catch (error) {
    console.error("Error in text extraction:", error);
    return "Error extracting text: " + error.message;
  }
}

// Extract text from parenthetical strings - most reliable method
function extractFromParentheticalStrings(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for strings in parentheses that contain actual text
  const stringPattern = /\(([^)]{3,100})\)/g;
  let match;
  
  while ((match = stringPattern.exec(pdfBytes)) !== null) {
    const content = match[1];
    
    // Skip if it looks like PDF commands or metadata
    if (isPdfCommand(content)) continue;
    
    // Decode the string
    const decoded = decodeTextString(content);
    
    // Check if this looks like actual readable text
    if (isReadableText(decoded)) {
      textParts.push(decoded);
    }
  }
  
  return textParts.join(' ');
}

// Extract from text showing operations (Tj, TJ commands)
function extractFromTextShowingOperations(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for Tj operations: (text)Tj
  const tjPattern = /\(([^)]+)\)\s*Tj/g;
  let match;
  
  while ((match = tjPattern.exec(pdfBytes)) !== null) {
    const content = match[1];
    if (!isPdfCommand(content)) {
      const decoded = decodeTextString(content);
      if (isReadableText(decoded)) {
        textParts.push(decoded);
      }
    }
  }
  
  // Look for TJ array operations: [(text1)(text2)]TJ
  const tjArrayPattern = /\[\s*([^\]]+)\s*\]\s*TJ/g;
  while ((match = tjArrayPattern.exec(pdfBytes)) !== null) {
    const arrayContent = match[1];
    const strings = arrayContent.match(/\(([^)]+)\)/g);
    if (strings) {
      for (const str of strings) {
        const cleanStr = str.replace(/[()]/g, '');
        if (!isPdfCommand(cleanStr)) {
          const decoded = decodeTextString(cleanStr);
          if (isReadableText(decoded)) {
            textParts.push(decoded);
          }
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract from content streams
function extractFromContentStreams(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for BT...ET blocks (text objects)
  const textBlockPattern = /BT\s+([\s\S]*?)\s+ET/g;
  let match;
  
  while ((match = textBlockPattern.exec(pdfBytes)) !== null) {
    const textBlock = match[1];
    
    // Extract text from this block
    const blockText = extractTextFromBlock(textBlock);
    if (blockText) {
      textParts.push(blockText);
    }
  }
  
  return textParts.join(' ');
}

// Extract text from a specific text block
function extractTextFromBlock(block: string): string {
  const textParts: string[] = [];
  const lines = block.split('\n');
  
  for (const line of lines) {
    // Look for text operations in this line
    const tjMatch = line.match(/\(([^)]+)\)\s*Tj/);
    if (tjMatch) {
      const content = tjMatch[1];
      if (!isPdfCommand(content)) {
        const decoded = decodeTextString(content);
        if (isReadableText(decoded)) {
          textParts.push(decoded);
        }
      }
    }
    
    // Look for array operations
    const tjArrayMatch = line.match(/\[\s*([^\]]+)\s*\]\s*TJ/);
    if (tjArrayMatch) {
      const arrayContent = tjArrayMatch[1];
      const strings = arrayContent.match(/\(([^)]+)\)/g);
      if (strings) {
        for (const str of strings) {
          const cleanStr = str.replace(/[()]/g, '');
          if (!isPdfCommand(cleanStr)) {
            const decoded = decodeTextString(cleanStr);
            if (isReadableText(decoded)) {
              textParts.push(decoded);
            }
          }
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract readable words from the entire PDF
function extractReadableWords(pdfBytes: string): string {
  const words: string[] = [];
  
  // Look for sequences of letters that form words
  const wordPattern = /\b[A-Za-z]{3,15}\b/g;
  let match;
  
  const seenWords = new Set();
  
  while ((match = wordPattern.exec(pdfBytes)) !== null) {
    const word = match[0];
    
    // Skip if it's a PDF command or we've seen it many times
    if (isPdfCommand(word) || seenWords.has(word.toLowerCase())) continue;
    
    // Check if it looks like a real word
    if (isLikelyRealWord(word)) {
      words.push(word);
      seenWords.add(word.toLowerCase());
      
      // Limit to prevent too much output
      if (words.length >= 100) break;
    }
  }
  
  return words.join(' ');
}

// Check if content looks like a PDF command or metadata
function isPdfCommand(content: string): boolean {
  const pdfCommands = [
    'Contents', 'CropBox', 'MediaBox', 'Parent', 'Resources', 'Rotate', 'Type', 'Page',
    'CIDInit', 'ProcSet', 'findresource', 'begin', 'dict', 'begincmap', 'CIDSystemInfo',
    'Registry', 'Ordering', 'Supplement', 'def', 'CMapName', 'begincodespacerange',
    'endcodespacerange', 'beginbfchar', 'endbfchar', 'endcmap', 'currentdict', 'CMap',
    'defineresource', 'pop', 'end', 'FlateDecode', 'Stream', 'endstream', 'obj', 'endobj',
    'xref', 'trailer', 'Font', 'FontDescriptor', 'Encoding', 'Width', 'Height', 'Length',
    'Filter', 'Adobe', 'Identity', 'UCS', 'CIDFont'
  ];
  
  // Check if the content is exactly a PDF command
  if (pdfCommands.includes(content)) return true;
  
  // Check if the content contains mostly PDF commands
  const words = content.split(/\s+/);
  const commandCount = words.filter(word => pdfCommands.includes(word)).length;
  
  return commandCount > words.length * 0.5;
}

// Check if text looks like actual readable content
function isReadableText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Must contain letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < 2) return false;
  
  // Should not be mostly numbers or special characters
  const nonLetterCount = text.length - letterCount;
  if (nonLetterCount > letterCount * 2) return false;
  
  // Should not contain many PDF-specific characters
  const pdfChars = (text.match(/[<>{}[\]\/\\]/g) || []).length;
  if (pdfChars > text.length * 0.3) return false;
  
  return true;
}

// Check if a word is likely a real word
function isLikelyRealWord(word: string): boolean {
  if (word.length < 3 || word.length > 15) return false;
  
  // Should have vowels
  const vowelCount = (word.match(/[aeiouAEIOU]/g) || []).length;
  if (vowelCount === 0) return false;
  
  // Should not be all uppercase (likely abbreviation or artifact)
  const isAllCaps = word === word.toUpperCase();
  const consonantRatio = (word.length - vowelCount) / word.length;
  
  return !(isAllCaps && consonantRatio > 0.7);
}

// Score text quality to find the best extraction
function scoreTextQuality(text: string): number {
  if (!text || text.length < 5) return 0;
  
  let score = 0;
  
  // Basic length score
  score += Math.min(text.length / 10, 50);
  
  // Word count score
  const words = text.split(/\s+/).filter(word => /[a-zA-Z]{3,}/.test(word));
  score += words.length * 2;
  
  // Sentence-like structure score
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  score += sentences.length * 10;
  
  // Penalize PDF artifacts
  const pdfArtifacts = (text.match(/\b(obj|endobj|stream|endstream|def|begin|end)\b/g) || []).length;
  score -= pdfArtifacts * 5;
  
  // Reward natural text patterns
  const capitalizedWords = (text.match(/\b[A-Z][a-z]+/g) || []).length;
  score += capitalizedWords;
  
  return Math.max(0, score);
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

// Clean the final extracted text
function cleanExtractedText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove obvious PDF artifacts that slipped through
  const artifacts = ['obj', 'endobj', 'stream', 'endstream', 'BT', 'ET', 'Tj', 'TJ', 'def', 'begin', 'end'];
  for (const artifact of artifacts) {
    const regex = new RegExp(`\\b${artifact}\\b`, 'g');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Clean up multiple spaces again
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Fallback extraction for difficult PDFs
function extractFallbackText(pdfBytes: string): string {
  console.log("Using fallback text extraction");
  
  // Try to find any readable content
  const words: string[] = [];
  const wordPattern = /\b[A-Za-z]{4,}\b/g;
  let match;
  
  const seenWords = new Set();
  
  while ((match = wordPattern.exec(pdfBytes)) !== null) {
    const word = match[0];
    
    if (!isPdfCommand(word) && !seenWords.has(word.toLowerCase()) && isLikelyRealWord(word)) {
      words.push(word);
      seenWords.add(word.toLowerCase());
      
      if (words.length >= 50) break;
    }
  }
  
  if (words.length >= 10) {
    return words.join(' ');
  }
  
  return "This PDF document contains complex formatting or encoding that makes text extraction difficult. The document may be image-based, password-protected, or use custom fonts that require specialized processing.";
}

// Additional utility functions for backward compatibility
export function cleanAndNormalizeText(text: string): string {
  return cleanExtractedText(text);
}

export function extractTextByLineBreaks(text: string): string {
  return extractFromParentheticalStrings(text);
}

export function extractTextPatterns(text: string): string {
  return extractReadableWords(text);
}

export function extractTextFromParentheses(text: string): string {
  return extractFromParentheticalStrings(text);
}

export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
