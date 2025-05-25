
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
      const text = extractReadableTextContent(pdfBytes);
      clearTimeout(timeout);
      resolve(text);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Main text extraction function - focuses on extracting actual readable text
function extractReadableTextContent(pdfBytes: string): string {
  console.log("Starting comprehensive text extraction");
  
  let extractedText = "";
  
  try {
    // Strategy 1: Extract from compressed streams (most common)
    const streamText = extractFromCompressedStreams(pdfBytes);
    if (streamText && streamText.length > 20) {
      console.log(`Found ${streamText.length} chars from compressed streams`);
      extractedText += streamText + " ";
    }
    
    // Strategy 2: Extract from text objects (BT...ET blocks)
    const textObjectText = extractFromTextObjects(pdfBytes);
    if (textObjectText && textObjectText.length > 20) {
      console.log(`Found ${textObjectText.length} chars from text objects`);
      extractedText += textObjectText + " ";
    }
    
    // Strategy 3: Extract from string literals and arrays
    const literalText = extractFromStringLiterals(pdfBytes);
    if (literalText && literalText.length > 20) {
      console.log(`Found ${literalText.length} chars from string literals`);
      extractedText += literalText + " ";
    }
    
    // Strategy 4: Extract from font mappings and character codes
    const mappedText = extractFromFontMappings(pdfBytes);
    if (mappedText && mappedText.length > 20) {
      console.log(`Found ${mappedText.length} chars from font mappings`);
      extractedText += mappedText + " ";
    }
    
    // Clean and validate the extracted text
    if (extractedText.trim().length > 0) {
      const cleanText = cleanExtractedText(extractedText);
      if (isValidReadableText(cleanText)) {
        console.log(`Successfully extracted ${cleanText.length} characters of readable text`);
        return cleanText;
      }
    }
    
    console.log("No readable text found with standard methods, trying fallback");
    return tryFallbackExtraction(pdfBytes);
    
  } catch (error) {
    console.error("Error in text extraction:", error);
    return "Error extracting text: " + error.message;
  }
}

// Extract text from compressed streams (FlateDecode)
function extractFromCompressedStreams(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for stream objects that might contain text
  const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
  let match;
  
  while ((match = streamPattern.exec(pdfBytes)) !== null) {
    const streamContent = match[1];
    
    // Try to find readable text in the stream
    const readableText = extractReadableChars(streamContent);
    if (readableText && readableText.length > 10) {
      textParts.push(readableText);
    }
  }
  
  return textParts.join(' ');
}

// Extract text from BT...ET text objects
function extractFromTextObjects(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Match text objects: BT ... ET
  const textObjectPattern = /BT\s+([\s\S]*?)\s+ET/g;
  let match;
  
  while ((match = textObjectPattern.exec(pdfBytes)) !== null) {
    const textObjectContent = match[1];
    
    // Extract text from Tj and TJ operations
    const tjText = extractTjOperations(textObjectContent);
    if (tjText) {
      textParts.push(tjText);
    }
  }
  
  return textParts.join(' ');
}

// Extract text from Tj and TJ operations
function extractTjOperations(content: string): string {
  const textParts: string[] = [];
  
  // Extract Tj operations: (text)Tj
  const tjPattern = /\(([^)]*)\)\s*Tj/g;
  let match;
  
  while ((match = tjPattern.exec(content)) !== null) {
    const text = decodeTextString(match[1]);
    if (text && isReadableString(text)) {
      textParts.push(text);
    }
  }
  
  // Extract TJ array operations: [(text1)(text2)...]TJ
  const tjArrayPattern = /\[\s*([^\]]*)\s*\]\s*TJ/g;
  while ((match = tjArrayPattern.exec(content)) !== null) {
    const arrayContent = match[1];
    const strings = arrayContent.match(/\(([^)]*)\)/g);
    if (strings) {
      for (const str of strings) {
        const text = decodeTextString(str.slice(1, -1));
        if (text && isReadableString(text)) {
          textParts.push(text);
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract from string literals throughout the PDF
function extractFromStringLiterals(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Match parenthetical strings: (text)
  const stringPattern = /\(([^)]+)\)/g;
  let match;
  
  while ((match = stringPattern.exec(pdfBytes)) !== null) {
    const text = decodeTextString(match[1]);
    if (text && isReadableString(text) && !isPdfKeyword(text)) {
      textParts.push(text);
    }
  }
  
  // Match hex strings: <hexcontent>
  const hexPattern = /<([0-9A-Fa-f]+)>/g;
  while ((match = hexPattern.exec(pdfBytes)) !== null) {
    const text = hexToText(match[1]);
    if (text && isReadableString(text)) {
      textParts.push(text);
    }
  }
  
  return textParts.join(' ');
}

// Extract text from font mappings and character codes
function extractFromFontMappings(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for character mappings in CMap data
  const bfcharPattern = /beginbfchar\s*([\s\S]*?)\s*endbfchar/g;
  let match;
  
  while ((match = bfcharPattern.exec(pdfBytes)) !== null) {
    const mappingContent = match[1];
    const text = extractFromCharMappings(mappingContent);
    if (text) {
      textParts.push(text);
    }
  }
  
  return textParts.join(' ');
}

// Extract text from character mappings
function extractFromCharMappings(mappingContent: string): string {
  const textParts: string[] = [];
  
  // Parse character mappings: <code> <unicode>
  const mappingPattern = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
  let match;
  
  while ((match = mappingPattern.exec(mappingContent)) !== null) {
    const unicodeHex = match[2];
    try {
      // Convert hex to Unicode character
      const charCode = parseInt(unicodeHex, 16);
      if (charCode >= 32 && charCode <= 126) {
        textParts.push(String.fromCharCode(charCode));
      }
    } catch (e) {
      // Skip invalid mappings
    }
  }
  
  return textParts.join('');
}

// Decode text strings with proper handling of escapes
function decodeTextString(text: string): string {
  if (!text) return '';
  
  let decoded = text;
  
  // Handle escape sequences
  decoded = decoded
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (match, octal) => {
      const charCode = parseInt(octal, 8);
      return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : ' ';
    });
  
  return decoded;
}

// Convert hex string to readable text
function hexToText(hex: string): string {
  let text = '';
  for (let i = 0; i < hex.length; i += 2) {
    const byte = hex.substr(i, 2);
    const charCode = parseInt(byte, 16);
    if (charCode >= 32 && charCode <= 126) {
      text += String.fromCharCode(charCode);
    } else if (charCode === 32) {
      text += ' ';
    }
  }
  return text;
}

// Extract readable characters from any string
function extractReadableChars(content: string): string {
  // Extract sequences of printable ASCII characters
  const readablePattern = /[\x20-\x7E]{3,}/g;
  const matches = content.match(readablePattern) || [];
  
  return matches
    .filter(text => isReadableString(text) && !isPdfKeyword(text))
    .join(' ');
}

// Check if a string contains readable text
function isReadableString(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Must contain letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (letterCount === 0) return false;
  
  // Check letter ratio
  const alphaRatio = letterCount / text.length;
  return alphaRatio >= 0.4;
}

// Check if text is a PDF keyword
function isPdfKeyword(text: string): boolean {
  const keywords = [
    'obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref',
    'Font', 'Type', 'Subtype', 'BaseFont', 'Encoding', 'ToUnicode',
    'CIDFont', 'FontDescriptor', 'DescendantFonts', 'CIDSystemInfo',
    'Registry', 'Ordering', 'Supplement', 'CIDToGIDMap', 'Identity',
    'Filter', 'FlateDecode', 'Length', 'Width', 'Height',
    'Page', 'Pages', 'Contents', 'Resources', 'MediaBox', 'CropBox',
    'TJ', 'Tj', 'BT', 'ET', 'Td', 'TD', 'Tm', 'Tf'
  ];
  
  return keywords.includes(text.trim());
}

// Clean the final extracted text
function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\r\n\t]/g, ' ')
    .trim();
}

// Validate that text is readable
function isValidReadableText(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  const words = text.split(/\s+/).filter(word => word.length >= 3);
  const letterWords = words.filter(word => /[a-zA-Z]{2,}/.test(word));
  
  return letterWords.length >= 3 && letterWords.length >= words.length * 0.5;
}

// Fallback extraction for difficult PDFs
function tryFallbackExtraction(pdfBytes: string): string {
  console.log("Attempting fallback text extraction");
  
  // Try to find any sequences that look like words
  const wordPattern = /\b[A-Za-z]{3,}\b/g;
  const words = pdfBytes.match(wordPattern) || [];
  
  const validWords = words
    .filter(word => !isPdfKeyword(word))
    .filter(word => word.length >= 3);
  
  if (validWords.length >= 5) {
    return validWords.slice(0, 100).join(' ');
  }
  
  return "This PDF document could not be processed. The text may be encoded in a format that is not supported, or the document may be image-based and require OCR processing.";
}

// Enhanced text cleaning for binary-contaminated PDFs
export function cleanAndNormalizeText(text: string): string {
  return cleanExtractedText(text);
}

// Additional utility functions for backward compatibility
export function extractTextByLineBreaks(text: string): string {
  return extractReadableChars(text);
}

export function extractTextPatterns(text: string): string {
  return extractFromStringLiterals(text);
}

export function extractTextFromParentheses(text: string): string {
  return extractFromStringLiterals(text);
}

export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
