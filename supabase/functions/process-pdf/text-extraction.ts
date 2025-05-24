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

// Main text extraction function - completely rewritten for better content extraction
function extractTextFromPdfBytes(pdfBytes: string): string {
  console.log("Starting comprehensive PDF text extraction");
  
  let allExtractedText = '';
  const extractedChunks: string[] = [];
  
  // Strategy 1: Extract all text from Tj operations (individual text strings)
  console.log("Strategy 1: Extracting from Tj operations");
  const tjMatches = pdfBytes.match(/\(((?:[^()\\]|\\.)*?)\)\s*Tj/g);
  if (tjMatches) {
    console.log(`Found ${tjMatches.length} Tj operations`);
    for (const match of tjMatches) {
      const textMatch = match.match(/\(((?:[^()\\]|\\.)*?)\)/);
      if (textMatch) {
        const decodedText = decodeTextString(textMatch[1]);
        if (decodedText && decodedText.trim().length > 0) {
          extractedChunks.push(decodedText);
        }
      }
    }
  }
  
  // Strategy 2: Extract from TJ operations (text arrays with positioning)
  console.log("Strategy 2: Extracting from TJ operations");
  const tjArrayMatches = pdfBytes.match(/\[((?:[^\[\]]|\[[^\]]*\])*?)\]\s*TJ/g);
  if (tjArrayMatches) {
    console.log(`Found ${tjArrayMatches.length} TJ operations`);
    for (const match of tjArrayMatches) {
      const arrayContent = match.match(/\[((?:[^\[\]]|\[[^\]]*\])*?)\]/);
      if (arrayContent) {
        // Extract all text strings from the array, ignoring numbers
        const textElements = arrayContent[1].match(/\(((?:[^()\\]|\\.)*?)\)/g);
        if (textElements) {
          for (const element of textElements) {
            const textMatch = element.match(/\(((?:[^()\\]|\\.)*?)\)/);
            if (textMatch) {
              const decodedText = decodeTextString(textMatch[1]);
              if (decodedText && decodedText.trim().length > 0) {
                extractedChunks.push(decodedText);
              }
            }
          }
        }
      }
    }
  }
  
  // Strategy 3: Extract from text blocks (BT...ET)
  console.log("Strategy 3: Extracting from text blocks");
  const textBlocks = pdfBytes.match(/BT\s*([\s\S]*?)\s*ET/g);
  if (textBlocks) {
    console.log(`Found ${textBlocks.length} text blocks`);
    for (const block of textBlocks) {
      const blockContent = block.replace(/^BT\s*/, '').replace(/\s*ET$/, '');
      const blockText = extractFromTextBlock(blockContent);
      if (blockText && blockText.trim().length > 0) {
        extractedChunks.push(blockText);
      }
    }
  }
  
  // Strategy 4: Extract from stream objects
  console.log("Strategy 4: Extracting from stream objects");
  const streamMatches = pdfBytes.match(/stream\s*([\s\S]*?)\s*endstream/g);
  if (streamMatches) {
    console.log(`Found ${streamMatches.length} streams`);
    for (const stream of streamMatches) {
      const streamContent = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
      const streamText = extractFromStream(streamContent);
      if (streamText && streamText.trim().length > 0) {
        extractedChunks.push(streamText);
      }
    }
  }
  
  // Strategy 5: Look for any parentheses-enclosed text that might be content
  console.log("Strategy 5: Extracting any remaining parentheses text");
  const allParenthesesMatches = pdfBytes.match(/\([^)]{2,}\)/g);
  if (allParenthesesMatches) {
    const uniqueTexts = new Set();
    for (const match of allParenthesesMatches) {
      const content = match.slice(1, -1); // Remove parentheses
      const decoded = decodeTextString(content);
      if (decoded && decoded.trim().length > 1 && !uniqueTexts.has(decoded)) {
        if (isLikelyContent(decoded)) {
          uniqueTexts.add(decoded);
          extractedChunks.push(decoded);
        }
      }
    }
  }
  
  // Combine all extracted text chunks
  console.log(`Extracted ${extractedChunks.length} text chunks`);
  
  // Remove duplicates and clean up
  const uniqueChunks = [...new Set(extractedChunks)]
    .filter(chunk => chunk && chunk.trim().length > 0)
    .map(chunk => chunk.trim());
  
  // Sort chunks by length (longer chunks first, they're more likely to be content)
  uniqueChunks.sort((a, b) => b.length - a.length);
  
  // Join chunks with appropriate spacing
  allExtractedText = uniqueChunks.join(' ');
  
  // Clean up the final text
  allExtractedText = cleanFinalText(allExtractedText);
  
  console.log(`Final extracted text length: ${allExtractedText.length}`);
  return allExtractedText;
}

// Decode text strings with proper handling of escape sequences
function decodeTextString(text: string): string {
  if (!text) return '';
  
  // Handle common escape sequences
  let decoded = text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
  
  // Handle octal escape sequences
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
      const hexPair = hex.substr(i, 2);
      const charCode = parseInt(hexPair, 16);
      if (charCode >= 32 && charCode <= 126) {
        result += String.fromCharCode(charCode);
      } else {
        result += ' ';
      }
    }
    return result;
  });
  
  return decoded;
}

// Extract text from a text block with better positioning handling
function extractFromTextBlock(blockContent: string): string {
  const lines = blockContent.split(/\r?\n/);
  const textParts: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Look for Tj operations
    const tjMatch = trimmedLine.match(/\(((?:[^()\\]|\\.)*?)\)\s*Tj/);
    if (tjMatch) {
      const decoded = decodeTextString(tjMatch[1]);
      if (decoded && decoded.trim().length > 0) {
        textParts.push(decoded);
      }
    }
    
    // Look for TJ operations
    const tjArrayMatch = trimmedLine.match(/\[((?:[^\[\]]|\[[^\]]*\])*?)\]\s*TJ/);
    if (tjArrayMatch) {
      const textElements = tjArrayMatch[1].match(/\(((?:[^()\\]|\\.)*?)\)/g);
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

// Extract text from stream content
function extractFromStream(streamContent: string): string {
  // Remove non-printable characters but preserve text operations
  let cleanStream = streamContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, ' ');
  
  const textParts: string[] = [];
  
  // Look for text operations in the stream
  const tjMatches = cleanStream.match(/\(((?:[^()\\]|\\.)*?)\)\s*Tj/g);
  if (tjMatches) {
    for (const match of tjMatches) {
      const textMatch = match.match(/\(((?:[^()\\]|\\.)*?)\)/);
      if (textMatch) {
        const decoded = decodeTextString(textMatch[1]);
        if (decoded && decoded.trim().length > 0) {
          textParts.push(decoded);
        }
      }
    }
  }
  
  const tjArrayMatches = cleanStream.match(/\[((?:[^\[\]]|\[[^\]]*\])*?)\]\s*TJ/g);
  if (tjArrayMatches) {
    for (const match of tjArrayMatches) {
      const textElements = match.match(/\(((?:[^()\\]|\\.)*?)\)/g);
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

// Check if text looks like actual content
function isLikelyContent(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Skip obvious metadata patterns
  if (text.match(/^(Identity|Adobe|UCS|CIDFont|FontDescriptor|Type|Filter)$/)) return false;
  
  // Must contain some letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  
  // Must not be mostly symbols
  const symbolCount = (text.match(/[^a-zA-Z0-9\s.,;:!?-]/g) || []).length;
  const symbolRatio = symbolCount / text.length;
  
  return letterRatio >= 0.3 && symbolRatio < 0.5 && text.length >= 2;
}

// Clean up the final extracted text
function cleanFinalText(text: string): string {
  if (!text) return '';
  
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove common PDF artifacts
  cleaned = cleaned.replace(/\b(Identity|Adobe|UCS|CIDFont|FontDescriptor|Type|Filter|FlateDecode)\b/g, '');
  
  // Clean up remaining artifacts
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
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
    .filter(text => text && isLikelyContent(text));
  
  return decoded.join(' ');
}

// Check for binary indicators
export function textContainsBinaryIndicators(text: string): boolean {
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  return ratio > 0.1;
}
