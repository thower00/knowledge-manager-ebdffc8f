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

// Main text extraction function - completely rewritten to focus on actual content
function extractTextFromPdfBytes(pdfBytes: string): string {
  console.log("Starting focused PDF content extraction");
  
  let extractedContent = '';
  const contentChunks: string[] = [];
  
  // Strategy 1: Extract from content streams (this is where the actual text usually is)
  console.log("Strategy 1: Extracting from content streams");
  const contentStreams = extractContentStreams(pdfBytes);
  if (contentStreams.length > 0) {
    console.log(`Found ${contentStreams.length} content streams`);
    for (const stream of contentStreams) {
      const streamText = extractTextFromContentStream(stream);
      if (streamText && streamText.length > 10) {
        contentChunks.push(streamText);
      }
    }
  }
  
  // Strategy 2: Look for text positioning commands with actual content
  console.log("Strategy 2: Extracting positioned text");
  const positionedText = extractPositionedText(pdfBytes);
  if (positionedText && positionedText.length > 10) {
    contentChunks.push(positionedText);
  }
  
  // Strategy 3: Extract from decoded text objects
  console.log("Strategy 3: Extracting from text objects");
  const textObjects = extractTextObjects(pdfBytes);
  if (textObjects.length > 0) {
    contentChunks.push(...textObjects);
  }
  
  // Strategy 4: Extract from BT...ET blocks with better filtering
  console.log("Strategy 4: Extracting from text blocks with content filtering");
  const textBlocks = extractFilteredTextBlocks(pdfBytes);
  if (textBlocks.length > 0) {
    contentChunks.push(...textBlocks);
  }
  
  // Combine and clean the extracted content
  console.log(`Found ${contentChunks.length} content chunks`);
  
  if (contentChunks.length === 0) {
    console.log("No content found, trying fallback extraction");
    return extractFallbackContent(pdfBytes);
  }
  
  // Remove duplicates and filter out PDF artifacts
  const uniqueContent = [...new Set(contentChunks)]
    .filter(chunk => isActualContent(chunk))
    .map(chunk => cleanTextContent(chunk))
    .filter(chunk => chunk.length > 5);
  
  extractedContent = uniqueContent.join(' ');
  
  // Final cleanup
  extractedContent = finalTextCleanup(extractedContent);
  
  console.log(`Final extracted content length: ${extractedContent.length}`);
  return extractedContent;
}

// Extract content streams - where the actual document content usually resides
function extractContentStreams(pdfBytes: string): string[] {
  const streams: string[] = [];
  
  // Look for stream objects that contain content (not just font definitions)
  const streamPattern = /(\d+\s+\d+\s+obj[\s\S]*?stream\s*\n)([\s\S]*?)(endstream)/g;
  let match;
  
  while ((match = streamPattern.exec(pdfBytes)) !== null) {
    const streamHeader = match[1];
    const streamContent = match[2];
    
    // Skip font streams and other metadata streams
    if (streamHeader.includes('/FontFile') || 
        streamHeader.includes('/CIDFont') ||
        streamHeader.includes('/CMap') ||
        streamHeader.includes('/FontDescriptor')) {
      continue;
    }
    
    // Look for content streams (they usually have /Length and sometimes /Filter)
    if (streamHeader.includes('/Length') && streamContent.length > 50) {
      streams.push(streamContent);
    }
  }
  
  return streams;
}

// Extract text from a content stream
function extractTextFromContentStream(streamContent: string): string {
  const textParts: string[] = [];
  
  // Remove any compression artifacts and binary data
  let cleanContent = streamContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, ' ');
  
  // Look for text show operations in the stream
  const tjOperations = cleanContent.match(/\(((?:[^()\\]|\\.)*?)\)\s*Tj/g);
  if (tjOperations) {
    for (const op of tjOperations) {
      const textMatch = op.match(/\(((?:[^()\\]|\\.)*?)\)/);
      if (textMatch) {
        const decodedText = decodeTextString(textMatch[1]);
        if (decodedText && isActualContent(decodedText)) {
          textParts.push(decodedText);
        }
      }
    }
  }
  
  // Look for text array operations
  const tjArrayOps = cleanContent.match(/\[((?:[^\[\]]|\[[^\]]*\])*?)\]\s*TJ/g);
  if (tjArrayOps) {
    for (const op of tjArrayOps) {
      const textElements = op.match(/\(((?:[^()\\]|\\.)*?)\)/g);
      if (textElements) {
        for (const element of textElements) {
          const textMatch = element.match(/\(((?:[^()\\]|\\.)*?)\)/);
          if (textMatch) {
            const decodedText = decodeTextString(textMatch[1]);
            if (decodedText && isActualContent(decodedText)) {
              textParts.push(decodedText);
            }
          }
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Extract positioned text (text with positioning commands)
function extractPositionedText(pdfBytes: string): string {
  const textParts: string[] = [];
  
  // Look for text positioning followed by text show
  const positionedTextPattern = /(\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+Td\s*\(((?:[^()\\]|\\.)*?)\)\s*Tj)/g;
  let match;
  
  while ((match = positionedTextPattern.exec(pdfBytes)) !== null) {
    const decodedText = decodeTextString(match[2]);
    if (decodedText && isActualContent(decodedText)) {
      textParts.push(decodedText);
    }
  }
  
  return textParts.join(' ');
}

// Extract text objects with better content filtering
function extractTextObjects(pdfBytes: string): string[] {
  const textParts: string[] = [];
  
  // Look for any string in parentheses that might be content
  const stringPattern = /\(([^)]+)\)/g;
  let match;
  
  const foundStrings = new Set<string>();
  
  while ((match = stringPattern.exec(pdfBytes)) !== null) {
    const rawText = match[1];
    const decodedText = decodeTextString(rawText);
    
    if (decodedText && 
        decodedText.length > 2 && 
        !foundStrings.has(decodedText) &&
        isActualContent(decodedText)) {
      foundStrings.add(decodedText);
      textParts.push(decodedText);
    }
  }
  
  return textParts;
}

// Extract from text blocks with better filtering
function extractFilteredTextBlocks(pdfBytes: string): string[] {
  const textParts: string[] = [];
  
  const textBlocks = pdfBytes.match(/BT\s*([\s\S]*?)\s*ET/g);
  if (textBlocks) {
    for (const block of textBlocks) {
      const blockContent = block.replace(/^BT\s*/, '').replace(/\s*ET$/, '');
      
      // Extract text from this block
      const blockText = extractTextFromTextBlock(blockContent);
      if (blockText && isActualContent(blockText)) {
        textParts.push(blockText);
      }
    }
  }
  
  return textParts;
}

// Extract text from a single text block
function extractTextFromTextBlock(blockContent: string): string {
  const textParts: string[] = [];
  
  // Look for all text operations in this block
  const tjOps = blockContent.match(/\(((?:[^()\\]|\\.)*?)\)\s*Tj/g);
  if (tjOps) {
    for (const op of tjOps) {
      const textMatch = op.match(/\(((?:[^()\\]|\\.)*?)\)/);
      if (textMatch) {
        const decoded = decodeTextString(textMatch[1]);
        if (decoded && decoded.trim().length > 0) {
          textParts.push(decoded);
        }
      }
    }
  }
  
  const tjArrayOps = blockContent.match(/\[((?:[^\[\]]|\[[^\]]*\])*?)\]\s*TJ/g);
  if (tjArrayOps) {
    for (const op of tjArrayOps) {
      const textElements = op.match(/\(((?:[^()\\]|\\.)*?)\)/g);
      if (textElements) {
        for (const element of textElements) {
          const textMatch = element.match(/\(((?:[^()\\]|\\.)*?)\)/);
          if (textMatch) {
            const decoded = decodeTextString(textMatch[1]);
            if (decoded && decoded.trim().length > 0) {
              textParts.push(decoded);
            }
          }
        }
      }
    }
  }
  
  return textParts.join(' ');
}

// Decode text strings with proper handling
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
  
  return decoded;
}

// Check if text is actual document content (not PDF artifacts)
function isActualContent(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Filter out common PDF artifacts and commands
  const pdfArtifacts = [
    'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref',
    'CIDFont', 'FontDescriptor', 'BaseFont', 'Encoding', 'ToUnicode',
    'CIDSystemInfo', 'Registry', 'Ordering', 'Supplement', 'CIDToGIDMap',
    'FontFile', 'FontName', 'ItalicAngle', 'StemV', 'CapHeight', 'Ascent',
    'Descent', 'FontBBox', 'Flags', 'Type', 'Subtype', 'Filter', 'Length',
    'FlateDecode', 'Adobe', 'Identity', 'UCS', 'CMap', 'findresource',
    'begincodespacerange', 'endcodespacerange', 'beginbfchar', 'endbfchar',
    'begincmap', 'endcmap', 'CMapName', 'CMapType', 'currentdict', 'defineresource',
    'ProcSet', 'CIDInit', 'dict', 'begin'
  ];
  
  // Check if text is mostly a PDF artifact
  const lowerText = text.toLowerCase();
  for (const artifact of pdfArtifacts) {
    if (lowerText === artifact.toLowerCase() || 
        (text.length < 20 && lowerText.includes(artifact.toLowerCase()))) {
      return false;
    }
  }
  
  // Must contain some letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  
  // Must not be mostly symbols or numbers
  const symbolCount = (text.match(/[^a-zA-Z0-9\s.,;:!?-]/g) || []).length;
  const symbolRatio = symbolCount / text.length;
  
  return letterRatio >= 0.4 && symbolRatio < 0.6 && text.length >= 2;
}

// Clean text content
function cleanTextContent(text: string): string {
  if (!text) return '';
  
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove any remaining PDF artifacts
  const artifactPattern = /\b(endobj|stream|endstream|xref|trailer|startxref|obj|CIDFont|FontDescriptor|BaseFont|Encoding|ToUnicode|Adobe|Identity|UCS|Filter|FlateDecode|Length|Type|Subtype)\b/gi;
  cleaned = cleaned.replace(artifactPattern, '');
  
  // Clean up spacing again
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Final text cleanup
function finalTextCleanup(text: string): string {
  if (!text) return '';
  
  // Remove any remaining artifacts and normalize spacing
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\b(endobj|stream|endstream|obj)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

// Fallback content extraction for difficult PDFs
function extractFallbackContent(pdfBytes: string): string {
  console.log("Using fallback content extraction");
  
  // Try to find any human-readable text sequences
  const readableTextPattern = /[A-Za-z][A-Za-z\s.,;:!?'-]{10,}/g;
  const matches = pdfBytes.match(readableTextPattern);
  
  if (matches && matches.length > 0) {
    const cleanMatches = matches
      .filter(match => isActualContent(match))
      .map(match => cleanTextContent(match))
      .filter(match => match.length > 5);
    
    if (cleanMatches.length > 0) {
      return cleanMatches.join(' ');
    }
  }
  
  return "Could not extract readable text from this PDF document. The PDF may be image-based, encrypted, or have an unsupported format.";
}

// Enhanced text cleaning for binary-contaminated PDFs
export function cleanAndNormalizeText(text: string): string {
  if (!text || text.length === 0) return "";
  
  console.log("Running enhanced text cleaning");
  
  // Extract words and sentences
  const words = text.split(/\s+/).filter(word => {
    // Keep words that are mostly letters and at least 2 characters
    const letterCount = (word.match(/[a-zA-Z]/g) || []).length;
    return word.length >= 2 && letterCount >= word.length * 0.5;
  });
  
  if (words.length > 10) {
    return words.join(' ');
  }
  
  return "Could not extract readable text from this PDF.";
}

// Extract text using line breaks
export function extractTextByLineBreaks(text: string): string {
  const lines = text.split(/[\r\n]+/);
  const cleanLines = lines
    .map(line => line.trim())
    .filter(line => line.length > 2 && /[a-zA-Z]/.test(line))
    .filter(line => !line.match(/^(obj|endobj|stream|endstream)$/));
  
  return cleanLines.join(' ');
}

// Extract text using patterns
export function extractTextPatterns(text: string): string {
  const patterns = [
    /[A-Z][a-z]+ [A-Z][a-z]+/g, // Names
    /[A-Za-z]{3,}(?:\s+[A-Za-z]{3,}){2,}/g, // Sentences
  ];
  
  const found: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      found.push(...matches);
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
    .filter(text => text && isActualContent(text));
  
  return decoded.join(' ');
}

// Check for binary indicators
export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
