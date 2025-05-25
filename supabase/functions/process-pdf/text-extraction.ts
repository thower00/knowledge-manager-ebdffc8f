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
      const text = extractActualTextContent(pdfBytes);
      clearTimeout(timeout);
      resolve(text);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Main text extraction function - completely rewritten to focus on actual text
function extractActualTextContent(pdfBytes: string): string {
  console.log("Starting focused text extraction for actual content");
  
  const extractedTexts: string[] = [];
  
  try {
    // Strategy 1: Extract from string literals in parentheses with proper decoding
    console.log("Extracting from string literals");
    const stringText = extractStringLiterals(pdfBytes);
    if (stringText.length > 50) {
      extractedTexts.push(stringText);
      console.log(`Found ${stringText.length} chars from string literals`);
    }
    
    // Strategy 2: Extract from text show operations with better parsing
    console.log("Extracting from text show operations");
    const showText = extractTextShowOperations(pdfBytes);
    if (showText.length > 50) {
      extractedTexts.push(showText);
      console.log(`Found ${showText.length} chars from text show operations`);
    }
    
    // Strategy 3: Extract from hex strings
    console.log("Extracting from hex strings");
    const hexText = extractHexStrings(pdfBytes);
    if (hexText.length > 50) {
      extractedTexts.push(hexText);
      console.log(`Found ${hexText.length} chars from hex strings`);
    }
    
    // Strategy 4: Extract words using pattern matching
    console.log("Extracting readable words");
    const wordText = extractReadableWords(pdfBytes);
    if (wordText.length > 50) {
      extractedTexts.push(wordText);
      console.log(`Found ${wordText.length} chars from word extraction`);
    }
    
    // Combine and clean results
    if (extractedTexts.length > 0) {
      const combinedText = extractedTexts.join(' ');
      const cleanedText = cleanAndValidateText(combinedText);
      console.log(`Final cleaned text: ${cleanedText.length} characters`);
      return cleanedText;
    }
    
    console.log("No readable text found, trying fallback");
    return extractFallbackContent(pdfBytes);
    
  } catch (error) {
    console.error("Error in text extraction:", error);
    return "Error extracting text from PDF: " + error.message;
  }
}

// Extract text from string literals in parentheses
function extractStringLiterals(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Match strings in parentheses: (text content)
  const stringPattern = /\(([^)]+)\)/g;
  let match;
  
  while ((match = stringPattern.exec(pdfBytes)) !== null) {
    const rawText = match[1];
    if (rawText && rawText.length > 1) {
      // Decode the text content
      const decodedText = decodeTextContent(rawText);
      if (decodedText && isActualText(decodedText)) {
        textParts.push(decodedText);
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract from text show operations (Tj, TJ)
function extractTextShowOperations(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Extract Tj operations: (text)Tj
  const tjPattern = /\(([^)]+)\)\s*Tj/g;
  let match;
  
  while ((match = tjPattern.exec(pdfBytes)) !== null) {
    const text = decodeTextContent(match[1]);
    if (text && isActualText(text)) {
      textParts.push(text);
    }
  }
  
  // Extract TJ operations: [(text1)(text2)...]TJ
  const tjArrayPattern = /\[\s*([^\]]+)\s*\]\s*TJ/g;
  while ((match = tjArrayPattern.exec(pdfBytes)) !== null) {
    const arrayContent = match[1];
    const strings = arrayContent.match(/\(([^)]+)\)/g);
    if (strings) {
      for (const str of strings) {
        const text = decodeTextContent(str.slice(1, -1));
        if (text && isActualText(text)) {
          textParts.push(text);
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract from hex strings
function extractHexStrings(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Match hex strings: <hexcontent>
  const hexPattern = /<([0-9A-Fa-f]+)>/g;
  let match;
  
  while ((match = hexPattern.exec(pdfBytes)) !== null) {
    const hexString = match[1];
    const text = hexToText(hexString);
    if (text && isActualText(text)) {
      textParts.push(text);
    }
  }
  
  return textParts.join(' ');
}

// Extract readable words using pattern matching
function extractReadableWords(pdfBytes: string): string {
  // Look for sequences of letters that form words
  const wordPattern = /\b[A-Za-z]{3,}\b/g;
  const words = pdfBytes.match(wordPattern) || [];
  
  // Filter out PDF keywords and artifacts
  const validWords = words.filter(word => !isPdfKeyword(word));
  
  return validWords.join(' ');
}

// Decode text content with proper character handling
function decodeTextContent(text: string): string {
  if (!text) return '';
  
  let decoded = text;
  
  // Handle common escape sequences
  decoded = decoded
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
  
  // Handle octal sequences
  decoded = decoded.replace(/\\([0-7]{1,3})/g, (match, octal) => {
    const charCode = parseInt(octal, 8);
    if (charCode >= 32 && charCode <= 126) {
      return String.fromCharCode(charCode);
    }
    return ' ';
  });
  
  // Filter out non-printable characters but keep letters, numbers, and common punctuation
  decoded = decoded.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ');
  
  return decoded.trim();
}

// Convert hex string to text
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

// Check if text is actual readable content
function isActualText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Must contain some letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (letterCount === 0) return false;
  
  // Check that it's not mostly symbols or numbers
  const alphaRatio = letterCount / text.length;
  
  // Must not be a PDF keyword
  if (isPdfKeyword(text.trim())) return false;
  
  return alphaRatio >= 0.3;
}

// Check if text is a PDF keyword/artifact
function isPdfKeyword(text: string): boolean {
  const keywords = [
    'obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref',
    'Font', 'Type', 'Subtype', 'BaseFont', 'Encoding', 'ToUnicode',
    'CIDFont', 'FontDescriptor', 'DescendantFonts', 'CIDSystemInfo',
    'Registry', 'Ordering', 'Supplement', 'CIDToGIDMap', 'Identity',
    'Adobe', 'UCS', 'Filter', 'FlateDecode', 'Length', 'Width', 'Height',
    'BitsPerComponent', 'ColorSpace', 'DeviceRGB', 'DeviceGray',
    'Page', 'Pages', 'Kids', 'Count', 'Parent', 'Resources', 'MediaBox',
    'CropBox', 'Contents', 'ProcSet', 'ExtGState', 'XObject', 'Image',
    'TJ', 'Tj', 'BT', 'ET', 'Td', 'TD', 'Tm', 'T*', 'Tf', 'TL', 'Tc', 'Tw', 'Tz', 'TZ',
    'q', 'Q', 'cm', 're', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'n', 'W', 'W*',
    'begin', 'end', 'dict', 'def', 'currentdict', 'defineresource', 'findresource',
    'begincmap', 'endcmap', 'begincodespacerange', 'endcodespacerange',
    'beginbfchar', 'endbfchar', 'beginbfrange', 'endbfrange',
    'CMapName', 'CMapType', 'CIDInit', 'ProcSet'
  ];
  
  const lowerText = text.toLowerCase().trim();
  return keywords.some(keyword => lowerText === keyword.toLowerCase());
}

// Clean and validate the final text
function cleanAndValidateText(text: string): string {
  if (!text) return '';
  
  // Remove PDF artifacts that might have slipped through
  let cleaned = text.replace(/\b(obj|endobj|stream|endstream|xref|trailer|startxref|Font|Type|Subtype|BaseFont|Encoding|ToUnicode|CIDFont|FontDescriptor|DescendantFonts|Adobe|Identity|Filter|FlateDecode|Length|BT|ET|Tj|TJ)\b/gi, '');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Split into words and filter
  const words = cleaned.split(/\s+/)
    .filter(word => word.length >= 2 && /[a-zA-Z]/.test(word))
    .filter(word => !isPdfKeyword(word));
  
  if (words.length >= 5) {
    return words.join(' ');
  }
  
  return "Could not extract readable text from this PDF document.";
}

// Fallback content extraction
function extractFallbackContent(pdfBytes: string): string {
  console.log("Using fallback content extraction");
  
  // Try to find any sequences that look like words
  const wordMatches = pdfBytes.match(/[A-Za-z]{4,}/g);
  if (wordMatches && wordMatches.length > 0) {
    const validWords = wordMatches
      .filter(word => !isPdfKeyword(word))
      .filter(word => word.length >= 4);
    
    if (validWords.length >= 5) {
      return validWords.slice(0, 50).join(' ');
    }
  }
  
  return "This PDF document appears to be image-based or uses complex encoding that prevents text extraction. Consider using OCR software for image-based PDFs.";
}

// Enhanced text cleaning for binary-contaminated PDFs
export function cleanAndNormalizeText(text: string): string {
  return cleanAndValidateText(text);
}

// Extract text using line breaks
export function extractTextByLineBreaks(text: string): string {
  return extractReadableWords(text);
}

// Extract text using patterns
export function extractTextPatterns(text: string): string {
  return extractStringLiterals(text);
}

// Extract from parentheses
export function extractTextFromParentheses(text: string): string {
  return extractStringLiterals(text);
}

// Check for binary indicators
export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
