
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
      const text = extractAllText(pdfBytes);
      clearTimeout(timeout);
      resolve(text);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Main extraction function - simplified and less aggressive
function extractAllText(pdfBytes: string): string {
  console.log("Starting comprehensive text extraction");
  
  try {
    // Strategy 1: Extract from text objects (BT/ET blocks)
    const textFromObjects = extractFromTextObjects(pdfBytes);
    if (textFromObjects && textFromObjects.length > 20) {
      console.log(`Found text from BT/ET objects: ${textFromObjects.length} chars`);
      return cleanExtractedText(textFromObjects);
    }
    
    // Strategy 2: Extract from parentheses (simple text strings)
    const textFromParens = extractFromParentheses(pdfBytes);
    if (textFromParens && textFromParens.length > 20) {
      console.log(`Found text from parentheses: ${textFromParens.length} chars`);
      return cleanExtractedText(textFromParens);
    }
    
    // Strategy 3: Extract from Tj and TJ operations
    const textFromOperations = extractFromTjOperations(pdfBytes);
    if (textFromOperations && textFromOperations.length > 20) {
      console.log(`Found text from Tj operations: ${textFromOperations.length} chars`);
      return cleanExtractedText(textFromOperations);
    }
    
    // Strategy 4: Extract from Unicode character maps
    const textFromUnicode = extractFromCmaps(pdfBytes);
    if (textFromUnicode && textFromUnicode.length > 20) {
      console.log(`Found text from Unicode maps: ${textFromUnicode.length} chars`);
      return cleanExtractedText(textFromUnicode);
    }
    
    // Strategy 5: Extract any readable sequences
    const anyReadableText = extractAnyReadableText(pdfBytes);
    if (anyReadableText && anyReadableText.length > 10) {
      console.log(`Found readable sequences: ${anyReadableText.length} chars`);
      return cleanExtractedText(anyReadableText);
    }
    
    return "This PDF document could not be processed for text extraction. It may be:\n• An image-based PDF requiring OCR\n• Password protected\n• Corrupted or in an unsupported format\n• Contains only graphics without text";
    
  } catch (error) {
    console.error("Error in text extraction:", error);
    return `Error extracting text: ${error.message}`;
  }
}

// Extract text from BT...ET text objects
function extractFromTextObjects(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Find text objects
  const textObjectPattern = /BT\s+([\s\S]*?)\s+ET/g;
  let match;
  
  while ((match = textObjectPattern.exec(pdfBytes)) !== null) {
    const objectContent = match[1];
    
    // Extract text from Tj and TJ operations within this object
    const objectText = extractTextFromOperations(objectContent);
    if (objectText) {
      textParts.push(objectText);
    }
  }
  
  return textParts.join(' ').trim();
}

// Extract text from parentheses - less restrictive
function extractFromParentheses(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for text in parentheses, being less restrictive
  const parenPattern = /\(([^)]{1,200})\)/g;
  let match;
  
  while ((match = parenPattern.exec(pdfBytes)) !== null) {
    const text = match[1];
    
    // Only skip obvious PDF commands
    if (!isObviousPdfCommand(text)) {
      const decoded = decodeTextString(text);
      if (decoded && decoded.length > 0) {
        textParts.push(decoded);
      }
    }
  }
  
  return textParts.join(' ').trim();
}

// Extract from Tj and TJ operations
function extractFromTjOperations(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Tj operations
  const tjPattern = /\(([^)]+)\)\s*Tj/g;
  let match;
  
  while ((match = tjPattern.exec(pdfBytes)) !== null) {
    const text = decodeTextString(match[1]);
    if (text && !isObviousPdfCommand(text)) {
      textParts.push(text);
    }
  }
  
  // TJ array operations
  const tjArrayPattern = /\[\s*([^\]]+)\s*\]\s*TJ/g;
  while ((match = tjArrayPattern.exec(pdfBytes)) !== null) {
    const arrayContent = match[1];
    const stringMatches = arrayContent.match(/\(([^)]+)\)/g);
    
    if (stringMatches) {
      for (const str of stringMatches) {
        const text = decodeTextString(str.replace(/[()]/g, ''));
        if (text && !isObviousPdfCommand(text)) {
          textParts.push(text);
        }
      }
    }
  }
  
  return textParts.join(' ').trim();
}

// Extract text from operations within an object
function extractTextFromOperations(content: string): string {
  const textParts: string[] = [];
  
  // Look for Tj operations
  const tjPattern = /\(([^)]+)\)\s*Tj/g;
  let match;
  
  while ((match = tjPattern.exec(content)) !== null) {
    const text = decodeTextString(match[1]);
    if (text && !isObviousPdfCommand(text)) {
      textParts.push(text);
    }
  }
  
  // Look for TJ array operations
  const tjArrayPattern = /\[\s*([^\]]+)\s*\]\s*TJ/g;
  while ((match = tjArrayPattern.exec(content)) !== null) {
    const arrayContent = match[1];
    const stringMatches = arrayContent.match(/\(([^)]+)\)/g);
    
    if (stringMatches) {
      for (const str of stringMatches) {
        const text = decodeTextString(str.replace(/[()]/g, ''));
        if (text && !isObviousPdfCommand(text)) {
          textParts.push(text);
        }
      }
    }
  }
  
  return textParts.join(' ').trim();
}

// Extract from character mapping tables
function extractFromCmaps(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for character mappings
  const bfcharPattern = /beginbfchar\s+([\s\S]*?)\s+endbfchar/g;
  let match;
  
  while ((match = bfcharPattern.exec(pdfBytes)) !== null) {
    const mappingContent = match[1];
    
    // Extract character mappings
    const charMappings = mappingContent.match(/<[0-9A-F]+>\s*\(([^)]+)\)/g);
    
    if (charMappings) {
      for (const mapping of charMappings) {
        const textMatch = mapping.match(/\(([^)]+)\)/);
        if (textMatch) {
          const text = decodeTextString(textMatch[1]);
          if (text && !isObviousPdfCommand(text)) {
            textParts.push(text);
          }
        }
      }
    }
  }
  
  return textParts.join('').trim();
}

// Extract any sequences that might be readable text
function extractAnyReadableText(pdfBytes: string): string {
  const words: string[] = [];
  
  // Look for sequences that look like words (less restrictive)
  const wordPattern = /[A-Za-z]{2,}/g;
  let match;
  
  const seenWords = new Set<string>();
  
  while ((match = wordPattern.exec(pdfBytes)) !== null) {
    const word = match[0];
    
    // Skip PDF keywords but allow other text
    if (!isPdfKeyword(word) && !seenWords.has(word.toLowerCase())) {
      words.push(word);
      seenWords.add(word.toLowerCase());
      
      // Stop after finding reasonable amount of text
      if (words.length > 100) break;
    }
  }
  
  return words.join(' ');
}

// Check if text is an obvious PDF command (simplified)
function isObviousPdfCommand(text: string): boolean {
  const pdfCommands = [
    'BT', 'ET', 'Tj', 'TJ', 'Tf', 'Td', 'TD', 'Tm', 'T*',
    'obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer',
    'startxref', 'CIDInit', 'ProcSet', 'findresource', 'begin',
    'dict', 'begincmap', 'endcmap', 'def', 'currentdict', 'end'
  ];
  
  return pdfCommands.includes(text.trim());
}

// Check if word is a PDF keyword
function isPdfKeyword(word: string): boolean {
  const keywords = [
    'CIDInit', 'ProcSet', 'findresource', 'begin', 'dict', 'begincmap',
    'CIDSystemInfo', 'Registry', 'Ordering', 'Supplement', 'def',
    'CMapName', 'begincodespacerange', 'endcodespacerange', 'beginbfchar',
    'endbfchar', 'endcmap', 'currentdict', 'CMap', 'defineresource',
    'pop', 'end', 'BaseFont', 'DescendantFonts', 'ToUnicode',
    'Contents', 'CropBox', 'MediaBox', 'Parent', 'Resources',
    'Rotate', 'Type', 'Page', 'FlateDecode', 'Stream', 'Adobe'
  ];
  
  return keywords.includes(word);
}

// Decode text strings with escape sequences
function decodeTextString(text: string): string {
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

// Clean the final extracted text
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  // Basic cleanup
  let cleaned = text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  // Remove any remaining PDF artifacts that slipped through
  cleaned = cleaned.replace(/\b(obj|endobj|stream|endstream|BT|ET|Tj|TJ)\b/gi, '');
  
  // Final whitespace cleanup
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Backward compatibility exports
export function cleanAndNormalizeText(text: string): string {
  return cleanExtractedText(text);
}

export function extractTextByLineBreaks(text: string): string {
  return extractFromTjOperations(text);
}

export function extractTextPatterns(text: string): string {
  return extractAnyReadableText(text);
}

export function extractTextFromParentheses(text: string): string {
  return extractFromParentheses(text);
}

export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
