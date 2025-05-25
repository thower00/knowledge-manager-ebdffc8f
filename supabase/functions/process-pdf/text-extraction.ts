
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

// Main text extraction function - focused on actual content extraction
function extractTextFromPdfBytes(pdfBytes: string): string {
  console.log("Starting comprehensive PDF text extraction");
  
  let extractedContent = '';
  const textChunks: string[] = [];
  
  try {
    // Strategy 1: Extract from Tj and TJ commands (most common text operators)
    console.log("Strategy 1: Extracting from Tj/TJ text show operations");
    const tjText = extractFromTjOperations(pdfBytes);
    if (tjText.length > 20) {
      textChunks.push(tjText);
      console.log(`Found ${tjText.length} chars from Tj operations`);
    }
    
    // Strategy 2: Extract from BT...ET text blocks
    console.log("Strategy 2: Extracting from BT/ET text blocks");
    const btText = extractFromTextBlocks(pdfBytes);
    if (btText.length > 20) {
      textChunks.push(btText);
      console.log(`Found ${btText.length} chars from text blocks`);
    }
    
    // Strategy 3: Extract from decoded streams
    console.log("Strategy 3: Extracting from content streams");
    const streamText = extractFromContentStreams(pdfBytes);
    if (streamText.length > 20) {
      textChunks.push(streamText);
      console.log(`Found ${streamText.length} chars from streams`);
    }
    
    // Strategy 4: Extract from character mappings and ToUnicode tables
    console.log("Strategy 4: Extracting using character mappings");
    const mappedText = extractUsingCharacterMappings(pdfBytes);
    if (mappedText.length > 20) {
      textChunks.push(mappedText);
      console.log(`Found ${mappedText.length} chars from character mappings`);
    }
    
    // Strategy 5: Direct string extraction with validation
    console.log("Strategy 5: Direct string extraction");
    const directText = extractDirectStrings(pdfBytes);
    if (directText.length > 20) {
      textChunks.push(directText);
      console.log(`Found ${directText.length} chars from direct extraction`);
    }
    
    // Combine all extracted text
    if (textChunks.length > 0) {
      // Remove duplicates and combine
      const uniqueChunks = [...new Set(textChunks)];
      extractedContent = uniqueChunks.join(' ');
      
      // Clean the final text
      extractedContent = cleanExtractedText(extractedContent);
      
      console.log(`Final combined text: ${extractedContent.length} characters`);
    } else {
      console.log("No text found with any strategy, trying fallback");
      extractedContent = extractFallbackText(pdfBytes);
    }
    
  } catch (error) {
    console.error("Error in text extraction:", error);
    extractedContent = "Error extracting text from PDF: " + error.message;
  }
  
  return extractedContent || "No readable text could be extracted from this PDF document.";
}

// Extract text from Tj and TJ operations (text show commands)
function extractFromTjOperations(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Find Tj operations: (text)Tj
  const tjPattern = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjPattern.exec(pdfBytes)) !== null) {
    const text = decodeTextString(match[1]);
    if (text && isReadableText(text)) {
      textParts.push(text);
    }
  }
  
  // Find TJ operations: [(text1)(text2)]TJ
  const tjArrayPattern = /\[\s*([^\]]*)\s*\]\s*TJ/g;
  while ((match = tjArrayPattern.exec(pdfBytes)) !== null) {
    const arrayContent = match[1];
    const stringMatches = arrayContent.match(/\(([^)]*)\)/g);
    if (stringMatches) {
      for (const stringMatch of stringMatches) {
        const text = decodeTextString(stringMatch.slice(1, -1));
        if (text && isReadableText(text)) {
          textParts.push(text);
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract text from BT...ET blocks (text objects)
function extractFromTextBlocks(pdfBytes: string): string {
  const textParts: string[] = [];
  
  const textBlockPattern = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  
  while ((match = textBlockPattern.exec(pdfBytes)) !== null) {
    const blockContent = match[1];
    
    // Extract text from within this block
    const blockText = extractFromTjOperations('dummy' + blockContent + 'dummy');
    if (blockText && isReadableText(blockText)) {
      textParts.push(blockText);
    }
  }
  
  return textParts.join(' ');
}

// Extract text from content streams
function extractFromContentStreams(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for stream objects that might contain text
  const streamPattern = /stream\s*\n([\s\S]*?)\nendstream/g;
  let match;
  
  while ((match = streamPattern.exec(pdfBytes)) !== null) {
    let streamContent = match[1];
    
    // Skip if this looks like a font stream or image
    if (streamContent.includes('FontFile') || 
        streamContent.includes('CIDFont') ||
        streamContent.includes('/Image') ||
        streamContent.includes('JFIF')) {
      continue;
    }
    
    // Try to decompress if it's FlateDecode
    if (streamContent.includes('FlateDecode')) {
      // For now, we'll skip compressed streams as they need zlib decompression
      continue;
    }
    
    // Extract text from uncompressed streams
    const streamText = extractFromTjOperations('dummy' + streamContent + 'dummy');
    if (streamText && isReadableText(streamText)) {
      textParts.push(streamText);
    }
  }
  
  return textParts.join(' ');
}

// Extract using character mappings and ToUnicode tables
function extractUsingCharacterMappings(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for beginbfchar...endbfchar mappings
  const bfcharPattern = /beginbfchar\s*([\s\S]*?)\s*endbfchar/g;
  let match;
  
  while ((match = bfcharPattern.exec(pdfBytes)) !== null) {
    const mappingContent = match[1];
    
    // Extract character mappings
    const mappingLines = mappingContent.split('\n');
    for (const line of mappingLines) {
      const mappingMatch = line.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
      if (mappingMatch) {
        try {
          const unicodeHex = mappingMatch[2];
          // Convert hex to Unicode character
          const charCode = parseInt(unicodeHex, 16);
          if (charCode > 31 && charCode < 127) { // Printable ASCII
            const char = String.fromCharCode(charCode);
            if (isReadableText(char)) {
              textParts.push(char);
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

// Direct string extraction with better validation
function extractDirectStrings(pdfBytes: string): string {
  const textParts: string[] = [];
  const foundStrings = new Set<string>();
  
  // Extract strings in parentheses
  const stringPattern = /\(([^)]{2,})\)/g;
  let match;
  
  while ((match = stringPattern.exec(pdfBytes)) !== null) {
    const text = decodeTextString(match[1]);
    if (text && 
        text.length > 1 && 
        !foundStrings.has(text) && 
        isReadableText(text) && 
        !isPdfArtifact(text)) {
      foundStrings.add(text);
      textParts.push(text);
    }
  }
  
  return textParts.join(' ');
}

// Decode PDF text strings
function decodeTextString(text: string): string {
  if (!text) return '';
  
  // Handle escape sequences
  let decoded = text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
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
  
  // Handle hexadecimal sequences
  decoded = decoded.replace(/<([0-9A-Fa-f]+)>/g, (match, hex) => {
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      const byte = hex.substr(i, 2);
      const charCode = parseInt(byte, 16);
      if (charCode >= 32 && charCode <= 126) {
        result += String.fromCharCode(charCode);
      }
    }
    return result;
  });
  
  return decoded;
}

// Check if text is readable content
function isReadableText(text: string): boolean {
  if (!text || text.length < 1) return false;
  
  // Must contain some letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (letterCount === 0) return false;
  
  // Check ratio of letters to total characters
  const letterRatio = letterCount / text.length;
  
  // Must not be mostly symbols
  const symbolCount = (text.match(/[^a-zA-Z0-9\s.,;:!?\-'"]/g) || []).length;
  const symbolRatio = symbolCount / text.length;
  
  return letterRatio >= 0.3 && symbolRatio < 0.7;
}

// Check if text is a PDF artifact
function isPdfArtifact(text: string): boolean {
  const artifacts = [
    'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref',
    'CIDFont', 'FontDescriptor', 'BaseFont', 'Encoding', 'ToUnicode',
    'Registry', 'Ordering', 'Supplement', 'Identity', 'Adobe',
    'FlateDecode', 'Type', 'Subtype', 'Filter', 'Length',
    'CIDSystemInfo', 'CIDToGIDMap', 'DescendantFonts',
    'ProcSet', 'findresource', 'defineresource', 'currentdict',
    'begincodespacerange', 'endcodespacerange', 'beginbfchar', 'endbfchar',
    'begincmap', 'endcmap', 'CMapName', 'CMapType'
  ];
  
  const lowerText = text.toLowerCase().trim();
  return artifacts.some(artifact => 
    lowerText === artifact.toLowerCase() || 
    (text.length < 15 && lowerText.includes(artifact.toLowerCase()))
  );
}

// Clean extracted text
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  // Remove PDF artifacts
  let cleaned = text.replace(/\b(endobj|stream|endstream|xref|trailer|obj|CIDFont|FontDescriptor|BaseFont|Encoding|ToUnicode|Adobe|Identity|Filter|FlateDecode|Length|Type|Subtype)\b/gi, '');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Remove empty parentheses and brackets
  cleaned = cleaned.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '');
  
  return cleaned;
}

// Fallback text extraction
function extractFallbackText(pdfBytes: string): string {
  console.log("Using fallback text extraction");
  
  // Try to find any readable text sequences
  const readablePattern = /[A-Za-z][A-Za-z\s.,;:!?'\-]{5,}/g;
  const matches = pdfBytes.match(readablePattern);
  
  if (matches && matches.length > 0) {
    const validMatches = matches
      .filter(match => isReadableText(match) && !isPdfArtifact(match))
      .map(match => match.trim())
      .filter(match => match.length > 3);
    
    if (validMatches.length > 0) {
      return validMatches.join(' ');
    }
  }
  
  return "Could not extract readable text from this PDF document. The PDF may be image-based, encrypted, or use unsupported encoding.";
}

// Enhanced text cleaning for binary-contaminated PDFs
export function cleanAndNormalizeText(text: string): string {
  if (!text || text.length === 0) return "";
  
  console.log("Running enhanced text cleaning");
  
  // Extract meaningful words
  const words = text.split(/\s+/).filter(word => {
    return word.length >= 2 && 
           /[a-zA-Z]/.test(word) && 
           !isPdfArtifact(word);
  });
  
  if (words.length > 5) {
    return words.join(' ');
  }
  
  return "Could not extract readable text from this PDF.";
}

// Extract text using line breaks
export function extractTextByLineBreaks(text: string): string {
  const lines = text.split(/[\r\n]+/);
  const cleanLines = lines
    .map(line => line.trim())
    .filter(line => line.length > 2 && 
                   isReadableText(line) && 
                   !isPdfArtifact(line));
  
  return cleanLines.join(' ');
}

// Extract text using patterns
export function extractTextPatterns(text: string): string {
  const patterns = [
    /[A-Z][a-z]+ [A-Z][a-z]+/g, // Names
    /[A-Za-z]{3,}(?:\s+[A-Za-z]{3,}){2,}/g, // Sentences
    /[A-Za-z]+[.,;:]?\s+[A-Za-z]+/g // Word pairs
  ];
  
  const found: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      found.push(...matches.filter(match => 
        isReadableText(match) && !isPdfArtifact(match)
      ));
    }
  }
  
  return [...new Set(found)].join(' ');
}

// Extract from parentheses
export function extractTextFromParentheses(text: string): string {
  const matches = text.match(/\([^)]+\)/g);
  if (!matches) return '';
  
  const decoded = matches
    .map(match => decodeTextString(match.slice(1, -1)))
    .filter(text => text && 
                   isReadableText(text) && 
                   !isPdfArtifact(text));
  
  return decoded.join(' ');
}

// Check for binary indicators
export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
