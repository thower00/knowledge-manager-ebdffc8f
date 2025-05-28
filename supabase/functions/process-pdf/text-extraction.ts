
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
      const text = extractReadableContentOnly(pdfBytes);
      clearTimeout(timeout);
      resolve(text);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Main extraction function - completely rewritten to focus on readable content
function extractReadableContentOnly(pdfBytes: string): string {
  console.log("Starting extraction focused on readable text content only");
  
  try {
    // Strategy 1: Look for actual text in parentheses within text operations
    const textFromOperations = extractFromTextOperations(pdfBytes);
    if (textFromOperations && isActualReadableText(textFromOperations)) {
      console.log(`Found readable text from operations: ${textFromOperations.length} chars`);
      return cleanFinalText(textFromOperations);
    }
    
    // Strategy 2: Extract from BT/ET text blocks with strict filtering
    const textFromBlocks = extractFromTextBlocks(pdfBytes);
    if (textFromBlocks && isActualReadableText(textFromBlocks)) {
      console.log(`Found readable text from blocks: ${textFromBlocks.length} chars`);
      return cleanFinalText(textFromBlocks);
    }
    
    // Strategy 3: Look for Unicode mappings and decode them
    const textFromUnicode = extractFromUnicodeMappings(pdfBytes);
    if (textFromUnicode && isActualReadableText(textFromUnicode)) {
      console.log(`Found readable text from Unicode: ${textFromUnicode.length} chars`);
      return cleanFinalText(textFromUnicode);
    }
    
    // Strategy 4: Extract any sequences that look like actual words
    const wordsFromContent = extractWordsFromContent(pdfBytes);
    if (wordsFromContent && wordsFromContent.length > 100) {
      console.log(`Found words from content: ${wordsFromContent.length} chars`);
      return cleanFinalText(wordsFromContent);
    }
    
    // If nothing readable found, return helpful message
    return "This PDF document could not be processed for text extraction. It may be:\n• An image-based PDF requiring OCR\n• Password protected\n• Corrupted or in an unsupported format\n• Contains only graphics without text";
    
  } catch (error) {
    console.error("Error in text extraction:", error);
    return `Error extracting text: ${error.message}`;
  }
}

// Extract text from Tj and TJ operations only
function extractFromTextOperations(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for (text)Tj patterns - single text strings
  const tjPattern = /\(([^)]{2,})\)\s*Tj/g;
  let match;
  
  while ((match = tjPattern.exec(pdfBytes)) !== null) {
    const text = match[1];
    if (!isPdfMetadata(text)) {
      const decoded = decodeTextContent(text);
      if (decoded && decoded.length > 1) {
        textParts.push(decoded);
      }
    }
  }
  
  // Look for [(text)]TJ patterns - text arrays
  const tjArrayPattern = /\[\s*([^\]]+)\s*\]\s*TJ/g;
  while ((match = tjArrayPattern.exec(pdfBytes)) !== null) {
    const arrayContent = match[1];
    // Extract strings from the array
    const stringMatches = arrayContent.match(/\(([^)]+)\)/g);
    if (stringMatches) {
      for (const str of stringMatches) {
        const text = str.replace(/[()]/g, '');
        if (!isPdfMetadata(text)) {
          const decoded = decodeTextContent(text);
          if (decoded && decoded.length > 1) {
            textParts.push(decoded);
          }
        }
      }
    }
  }
  
  return textParts.join(' ').trim();
}

// Extract from BT...ET text blocks with strict filtering
function extractFromTextBlocks(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Find text objects (BT...ET blocks)
  const textBlockPattern = /BT\s+([\s\S]*?)\s+ET/g;
  let match;
  
  while ((match = textBlockPattern.exec(pdfBytes)) !== null) {
    const blockContent = match[1];
    
    // Only look for text operations within this block
    const blockText = extractFromTextOperations(blockContent);
    if (blockText) {
      textParts.push(blockText);
    }
  }
  
  return textParts.join(' ').trim();
}

// Extract from Unicode character mappings
function extractFromUnicodeMappings(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for beginbfchar...endbfchar sections (character mappings)
  const bfcharPattern = /beginbfchar\s+([\s\S]*?)\s+endbfchar/g;
  let match;
  
  while ((match = bfcharPattern.exec(pdfBytes)) !== null) {
    const mappingContent = match[1];
    
    // Extract character mappings like <0041> <0041> or <0041> (A)
    const charMappings = mappingContent.match(/<[0-9A-F]+>\s*(?:<[0-9A-F]+>|\([^)]+\))/g);
    
    if (charMappings) {
      for (const mapping of charMappings) {
        const parts = mapping.split(/\s+/);
        if (parts.length >= 2) {
          const target = parts[1];
          
          // If target is in parentheses, extract it
          if (target.startsWith('(') && target.endsWith(')')) {
            const text = target.slice(1, -1);
            if (!isPdfMetadata(text)) {
              const decoded = decodeTextContent(text);
              if (decoded && decoded.length > 0) {
                textParts.push(decoded);
              }
            }
          }
        }
      }
    }
  }
  
  return textParts.join('').trim();
}

// Extract sequences that look like actual words
function extractWordsFromContent(pdfBytes: string): string {
  const words: string[] = [];
  
  // Look for parenthetical content that contains actual words
  const parenthesesPattern = /\(([^)]{3,50})\)/g;
  let match;
  
  const seenWords = new Set<string>();
  
  while ((match = parenthesesPattern.exec(pdfBytes)) !== null) {
    const content = match[1];
    
    // Skip if it looks like PDF metadata
    if (isPdfMetadata(content)) continue;
    
    // Decode and check if it contains actual words
    const decoded = decodeTextContent(content);
    if (decoded) {
      // Look for actual word patterns
      const wordMatches = decoded.match(/[A-Za-z]{3,}/g);
      if (wordMatches) {
        for (const word of wordMatches) {
          const lowerWord = word.toLowerCase();
          if (!seenWords.has(lowerWord) && isLikelyWord(word)) {
            words.push(word);
            seenWords.add(lowerWord);
          }
        }
      }
    }
  }
  
  return words.join(' ');
}

// Check if content is PDF metadata/commands
function isPdfMetadata(content: string): boolean {
  const pdfKeywords = [
    'CIDInit', 'ProcSet', 'findresource', 'begin', 'dict', 'begincmap', 'CIDSystemInfo',
    'Registry', 'Ordering', 'Supplement', 'def', 'CMapName', 'begincodespacerange',
    'endcodespacerange', 'beginbfchar', 'endbfchar', 'endcmap', 'currentdict', 'CMap',
    'defineresource', 'pop', 'end', 'BaseFont', 'DescendantFonts', 'CIDToGIDMap',
    'Ascent', 'CapHeight', 'Descent', 'Flags', 'FontBBox', 'FontName', 'ItalicAngle',
    'StemV', 'Subtype', 'ToUnicode', 'Contents', 'CropBox', 'MediaBox', 'Parent',
    'Resources', 'Rotate', 'Type', 'Page', 'FlateDecode', 'Stream', 'Identity', 'Adobe'
  ];
  
  // Check if content contains mostly PDF keywords
  const words = content.split(/\s+/);
  const keywordCount = words.filter(word => pdfKeywords.includes(word)).length;
  
  return keywordCount > words.length * 0.3 || pdfKeywords.includes(content.trim());
}

// Decode text content with proper escape handling
function decodeTextContent(text: string): string {
  if (!text) return '';
  
  try {
    // Handle PDF escape sequences
    let decoded = text
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\([0-7]{1,3})/g, (match, octal) => {
        const charCode = parseInt(octal, 8);
        return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : '';
      });
    
    return decoded;
  } catch (error) {
    return text;
  }
}

// Check if text is actually readable content
function isActualReadableText(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Must contain letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < 5) return false;
  
  // Should not be mostly PDF keywords
  if (isPdfMetadata(text)) return false;
  
  // Should have reasonable letter to non-letter ratio
  const nonLetterCount = text.length - letterCount;
  if (nonLetterCount > letterCount * 3) return false;
  
  return true;
}

// Check if a word is likely a real word
function isLikelyWord(word: string): boolean {
  if (word.length < 3 || word.length > 20) return false;
  
  // Should have vowels
  const vowelCount = (word.match(/[aeiouAEIOU]/g) || []).length;
  if (vowelCount === 0 && word.length > 4) return false;
  
  // Should not be all consonants
  const consonantRatio = (word.length - vowelCount) / word.length;
  if (consonantRatio > 0.8) return false;
  
  return true;
}

// Clean the final extracted text
function cleanFinalText(text: string): string {
  if (!text) return '';
  
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove any remaining PDF artifacts
  const artifacts = ['obj', 'endobj', 'stream', 'endstream', 'BT', 'ET', 'Tj', 'TJ'];
  for (const artifact of artifacts) {
    const regex = new RegExp(`\\b${artifact}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Final cleanup
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Backward compatibility exports
export function cleanAndNormalizeText(text: string): string {
  return cleanFinalText(text);
}

export function extractTextByLineBreaks(text: string): string {
  return extractFromTextOperations(text);
}

export function extractTextPatterns(text: string): string {
  return extractWordsFromContent(text);
}

export function extractTextFromParentheses(text: string): string {
  return extractFromTextOperations(text);
}

export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
