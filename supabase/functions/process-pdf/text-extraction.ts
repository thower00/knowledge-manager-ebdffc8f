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

// Main text extraction function - completely rewritten for comprehensive content extraction
function extractTextFromPdfBytes(pdfBytes: string): string {
  let extractedText = '';
  
  console.log("Starting comprehensive PDF text extraction");
  
  // Strategy 1: Extract from content streams with aggressive decompression simulation
  const streamMatches = pdfBytes.match(/stream\s*([\s\S]*?)\s*endstream/g);
  if (streamMatches) {
    console.log(`Found ${streamMatches.length} content streams`);
    
    for (const streamMatch of streamMatches) {
      const streamContent = streamMatch.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
      
      // Try to extract readable text from the stream
      const streamText = extractFromContentStream(streamContent);
      if (streamText.length > 0) {
        extractedText += streamText + ' ';
      }
    }
  }
  
  // Strategy 2: Look for text operations (Tj, TJ, Td, TD)
  console.log("Extracting text from PDF operators");
  
  // Extract from Tj operations (show text)
  const tjMatches = pdfBytes.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)\s*Tj/g);
  if (tjMatches) {
    console.log(`Found ${tjMatches.length} Tj text operations`);
    
    for (const match of tjMatches) {
      const textContent = match.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
      if (textContent) {
        const cleanText = decodeTextContent(textContent);
        if (cleanText.length > 0) {
          extractedText += cleanText + ' ';
        }
      }
    }
  }
  
  // Extract from TJ operations (show text with individual glyph positioning)
  const tjArrayMatches = pdfBytes.match(/\[((?:[^\[\]\\]|\\.|\\[0-7]{3})*)\]\s*TJ/g);
  if (tjArrayMatches) {
    console.log(`Found ${tjArrayMatches.length} TJ array operations`);
    
    for (const match of tjArrayMatches) {
      const arrayContent = match.match(/\[((?:[^\[\]\\]|\\.|\\[0-7]{3})*)\]/)?.[1];
      if (arrayContent) {
        // Extract text from array elements, ignoring positioning numbers
        const textElements = arrayContent.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/g);
        if (textElements) {
          for (const element of textElements) {
            const textContent = element.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
            if (textContent) {
              const cleanText = decodeTextContent(textContent);
              if (cleanText.length > 0) {
                extractedText += cleanText + ' ';
              }
            }
          }
        }
      }
    }
  }
  
  // Strategy 3: Extract text from BT/ET blocks with positioning
  const textBlocks = pdfBytes.match(/BT\s*([\s\S]*?)\s*ET/g);
  if (textBlocks) {
    console.log(`Found ${textBlocks.length} text blocks`);
    
    for (const block of textBlocks) {
      const blockContent = block.replace(/^BT\s*/, '').replace(/\s*ET$/, '');
      const blockText = extractFromTextBlock(blockContent);
      if (blockText.length > 0) {
        extractedText += blockText + ' ';
      }
    }
  }
  
  // Strategy 4: Look for XObject references that might contain text
  const xObjectMatches = pdfBytes.match(/\/XObject\s*<<[\s\S]*?>>/g);
  if (xObjectMatches) {
    console.log(`Found ${xObjectMatches.length} XObject references`);
    
    for (const xObjectMatch of xObjectMatches) {
      // Look for referenced objects that might contain text
      const objRefs = xObjectMatch.match(/\/\w+\s+(\d+)\s+\d+\s+R/g);
      if (objRefs) {
        for (const objRef of objRefs) {
          const objId = objRef.match(/(\d+)\s+\d+\s+R/)?.[1];
          if (objId) {
            // Find the referenced object and extract text from it
            const objPattern = new RegExp(`${objId}\\s+\\d+\\s+obj[\\s\\S]*?endobj`, 'g');
            const objMatch = pdfBytes.match(objPattern);
            if (objMatch && objMatch[0]) {
              const objText = extractFromPdfObject(objMatch[0]);
              if (objText.length > 0) {
                extractedText += objText + ' ';
              }
            }
          }
        }
      }
    }
  }
  
  // Strategy 5: Extract from font encodings and character mappings
  const fontMappings = extractFontMappings(pdfBytes);
  if (fontMappings.length > 0) {
    console.log(`Found font mappings, attempting character reconstruction`);
    // Use font mappings to better decode text
    const decodedText = applyFontMappings(extractedText, fontMappings);
    if (decodedText.length > extractedText.length) {
      extractedText = decodedText;
    }
  }
  
  // Strategy 6: Extract any remaining text patterns
  const additionalText = extractAdditionalTextPatterns(pdfBytes);
  if (additionalText.length > 0) {
    extractedText += additionalText + ' ';
  }
  
  // Final cleaning and structuring
  extractedText = finalTextProcessing(extractedText);
  
  console.log(`Final extracted text length: ${extractedText.length}`);
  return extractedText.trim();
}

// Extract text from content streams with better handling
function extractFromContentStream(streamContent: string): string {
  let text = '';
  
  // Remove binary data patterns and focus on text operations
  let cleanStream = streamContent
    .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ') // Remove non-printable chars
    .replace(/\s+/g, ' '); // Normalize whitespace
  
  // Look for text show operations in the stream
  const textOperations = [
    /\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)\s*Tj/g,
    /\[((?:[^\[\]\\]|\\.|\\[0-7]{3})*)\]\s*TJ/g,
    /\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)\s*'/g, // Quote operator
    /\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)\s*"/g  // Double quote operator
  ];
  
  for (const pattern of textOperations) {
    const matches = cleanStream.match(pattern);
    if (matches) {
      for (const match of matches) {
        const textContent = match.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
        if (textContent) {
          const cleanText = decodeTextContent(textContent);
          if (cleanText.length > 0) {
            text += cleanText + ' ';
          }
        }
      }
    }
  }
  
  return text;
}

// Extract text from a text block with positioning awareness
function extractFromTextBlock(blockContent: string): string {
  let text = '';
  let currentX = 0;
  let currentY = 0;
  let lineTexts: Array<{x: number, y: number, text: string}> = [];
  
  // Parse text positioning and content
  const lines = blockContent.split(/\r?\n/);
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Track position changes
    const tdMatch = trimmedLine.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Td/);
    if (tdMatch) {
      currentX += parseFloat(tdMatch[1]);
      currentY += parseFloat(tdMatch[2]);
      continue;
    }
    
    const tmMatch = trimmedLine.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm/);
    if (tmMatch) {
      currentX = parseFloat(tmMatch[5]);
      currentY = parseFloat(tmMatch[6]);
      continue;
    }
    
    // Extract text content
    const tjMatch = trimmedLine.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)\s*Tj/);
    if (tjMatch) {
      const textContent = decodeTextContent(tjMatch[1]);
      if (textContent.length > 0) {
        lineTexts.push({x: currentX, y: currentY, text: textContent});
      }
    }
    
    // Handle TJ arrays
    const tjArrayMatch = trimmedLine.match(/\[((?:[^\[\]\\]|\\.|\\[0-7]{3})*)\]\s*TJ/);
    if (tjArrayMatch) {
      const arrayContent = tjArrayMatch[1];
      const textElements = arrayContent.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/g);
      if (textElements) {
        let lineText = '';
        for (const element of textElements) {
          const textContent = element.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
          if (textContent) {
            lineText += decodeTextContent(textContent);
          }
        }
        if (lineText.length > 0) {
          lineTexts.push({x: currentX, y: currentY, text: lineText});
        }
      }
    }
  }
  
  // Sort by position (top to bottom, left to right)
  lineTexts.sort((a, b) => {
    const yDiff = b.y - a.y; // Higher Y first (PDF coordinates)
    if (Math.abs(yDiff) > 5) return yDiff > 0 ? 1 : -1;
    return a.x - b.x; // Left to right
  });
  
  // Combine positioned text
  for (const item of lineTexts) {
    text += item.text + ' ';
  }
  
  return text;
}

// Enhanced text content decoding
function decodeTextContent(text: string): string {
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
    
  // Handle octal escape sequences
  decoded = decoded.replace(/\\([0-7]{1,3})/g, (match, octal) => {
    const charCode = parseInt(octal, 8);
    // Convert to Unicode if it's a printable character
    if (charCode >= 32 && charCode <= 126) {
      return String.fromCharCode(charCode);
    } else if (charCode >= 160 && charCode <= 255) {
      // Latin-1 supplement
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
  
  // Clean up the result
  decoded = decoded
    .replace(/[^\x20-\x7E\r\n\t\u00A0-\u00FF]/g, ' ') // Keep printable chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Only return if it looks like actual text
  if (decoded.length >= 1 && /[a-zA-Z0-9]/.test(decoded)) {
    return decoded;
  }
  
  return '';
}

// Extract from PDF objects
function extractFromPdfObject(objContent: string): string {
  let text = '';
  
  // Look for streams within the object
  const streamMatches = objContent.match(/stream\s*([\s\S]*?)\s*endstream/g);
  if (streamMatches) {
    for (const streamMatch of streamMatches) {
      const streamContent = streamMatch.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
      text += extractFromContentStream(streamContent) + ' ';
    }
  }
  
  // Look for direct text content
  const textMatches = objContent.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/g);
  if (textMatches) {
    for (const match of textMatches) {
      const textContent = match.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
      if (textContent) {
        const cleanText = decodeTextContent(textContent);
        if (cleanText.length > 0) {
          text += cleanText + ' ';
        }
      }
    }
  }
  
  return text;
}

// Extract font mappings for better character decoding
function extractFontMappings(pdfBytes: string): Array<{from: string, to: string}> {
  const mappings: Array<{from: string, to: string}> = [];
  
  // Look for CMap definitions
  const cmapMatches = pdfBytes.match(/beginbfchar([\s\S]*?)endbfchar/g);
  if (cmapMatches) {
    for (const cmapMatch of cmapMatches) {
      const content = cmapMatch.replace(/beginbfchar/, '').replace(/endbfchar/, '');
      const lines = content.split(/\r?\n/);
      
      for (const line of lines) {
        const mapping = line.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
        if (mapping) {
          mappings.push({
            from: mapping[1],
            to: mapping[2]
          });
        }
      }
    }
  }
  
  return mappings;
}

// Apply font mappings to improve text decoding
function applyFontMappings(text: string, mappings: Array<{from: string, to: string}>): string {
  let result = text;
  
  for (const mapping of mappings) {
    try {
      const fromChar = String.fromCharCode(parseInt(mapping.from, 16));
      const toChar = String.fromCharCode(parseInt(mapping.to, 16));
      result = result.replace(new RegExp(fromChar, 'g'), toChar);
    } catch (e) {
      // Skip invalid mappings
    }
  }
  
  return result;
}

// Extract additional text patterns
function extractAdditionalTextPatterns(pdfBytes: string): string {
  let text = '';
  
  // Look for metadata text
  const titleMatch = pdfBytes.match(/\/Title\s*\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/);
  if (titleMatch) {
    const title = decodeTextContent(titleMatch[1]);
    if (title.length > 0) {
      text += `Document Title: ${title}\n`;
    }
  }
  
  const authorMatch = pdfBytes.match(/\/Author\s*\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/);
  if (authorMatch) {
    const author = decodeTextContent(authorMatch[1]);
    if (author.length > 0) {
      text += `Document Author: ${author}\n`;
    }
  }
  
  const subjectMatch = pdfBytes.match(/\/Subject\s*\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/);
  if (subjectMatch) {
    const subject = decodeTextContent(subjectMatch[1]);
    if (subject.length > 0) {
      text += `Document Subject: ${subject}\n`;
    }
  }
  
  // Look for any other parentheses-enclosed content that might be text
  const allParentheses = pdfBytes.match(/\([^)]{3,}\)/g);
  if (allParentheses) {
    const seen = new Set();
    for (const match of allParentheses) {
      const content = match.slice(1, -1);
      const decoded = decodeTextContent(content);
      if (decoded.length > 2 && !seen.has(decoded) && isLikelyText(decoded)) {
        seen.add(decoded);
        text += decoded + ' ';
      }
    }
  }
  
  return text;
}

// Final text processing and cleanup
function finalTextProcessing(text: string): string {
  if (!text) return '';
  
  // Split into sentences and clean each one
  const sentences = text.split(/[.!?]+/).map(sentence => {
    return sentence
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
      .trim();
  }).filter(sentence => sentence.length > 3 && /[a-zA-Z]/.test(sentence));
  
  // Rejoin sentences with proper punctuation
  let result = sentences.join('. ');
  
  // Add final period if not present
  if (result.length > 0 && !result.match(/[.!?]$/)) {
    result += '.';
  }
  
  // Clean up any remaining artifacts
  result = result
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
  
  return result;
}

// Check if text looks like actual readable content
function isLikelyText(text: string): boolean {
  if (!text || text.length < 3) return false;
  
  // Must contain letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  
  // Must not be mostly numbers or symbols
  const numberCount = (text.match(/[0-9]/g) || []).length;
  const symbolCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
  
  return letterRatio >= 0.4 && 
         numberCount < text.length * 0.7 && 
         symbolCount < text.length * 0.5;
}

// Ultra-aggressive text cleaning for binary-contaminated PDFs
export function cleanAndNormalizeText(text: string): string {
  if (!text || text.length === 0) return "";
  
  console.log("Running ultra-aggressive text cleaning for binary-contaminated PDF");
  console.log(`Original text length: ${text.length}`);
  
  // Step 1: Extract readable words using multiple strategies
  const words = extractReadableWords(text);
  
  if (words.length > 50) {
    console.log(`Successfully extracted ${words.length} readable words`);
    return words.join(' ');
  }
  
  // Step 2: Try sentence extraction
  const sentences = extractReadableSentences(text);
  
  if (sentences.length > 10) {
    console.log(`Successfully extracted ${sentences.length} readable sentences`);
    return sentences.join(' ');
  }
  
  // Step 3: Extract any meaningful text patterns
  const meaningfulText = extractMeaningfulPatterns(text);
  
  if (meaningfulText.length > 20) {
    console.log(`Successfully extracted meaningful text patterns: ${meaningfulText.length} chars`);
    return meaningfulText;
  }
  
  console.log("Could not extract readable text from binary-contaminated PDF");
  return "Could not extract readable text from this PDF. The document appears to contain primarily binary data or encoded content.";
}

// Extract readable words from contaminated text
function extractReadableWords(text: string): string[] {
  const words: string[] = [];
  
  // Split by common separators and filter for actual words
  const tokens = text.split(/[\s\n\r\t\u0000-\u001F\u007F-\u009F\uFFFD]+/);
  
  for (const token of tokens) {
    // Look for words that are likely to be actual text
    if (isReadableWord(token)) {
      words.push(token);
    }
  }
  
  return words;
}

// Check if a token looks like a readable word
function isReadableWord(token: string): boolean {
  if (!token || token.length < 2) return false;
  
  // Must contain mostly letters
  const letterCount = (token.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / token.length;
  
  // Accept tokens that are mostly letters or common punctuation
  if (letterRatio >= 0.7 && token.length >= 2) {
    // Exclude tokens with too many special characters
    const specialChars = token.match(/[^\w\s.,;:!?()\-'"/]/g);
    const specialRatio = specialChars ? specialChars.length / token.length : 0;
    
    return specialRatio < 0.3;
  }
  
  return false;
}

// Extract readable sentences from contaminated text
function extractReadableSentences(text: string): string[] {
  const sentences: string[] = [];
  
  // Look for patterns that might be sentences
  const sentencePatterns = [
    /[A-Z][a-z]{2,}[^.!?]*[.!?]/g,  // Traditional sentences
    /[A-Z][a-z]+ [a-z]+ [a-z]+/g,   // Multiple words starting with capital
    /[a-zA-Z]{3,} [a-zA-Z]{3,} [a-zA-Z]{3,}/g // Three consecutive words
  ];
  
  for (const pattern of sentencePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (isReadableSentence(match)) {
          sentences.push(match.trim());
        }
      }
    }
  }
  
  return [...new Set(sentences)]; // Remove duplicates
}

// Check if text looks like a readable sentence
function isReadableSentence(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Must contain mostly letters and spaces
  const alphaSpaceCount = (text.match(/[a-zA-Z\s]/g) || []).length;
  const alphaSpaceRatio = alphaSpaceCount / text.length;
  
  return alphaSpaceRatio >= 0.8;
}

// Extract meaningful patterns from binary-contaminated text
function extractMeaningfulPatterns(text: string): string {
  const patterns: string[] = [];
  
  // Look for common document metadata patterns
  const metadataPatterns = [
    /[A-Z][a-z]+ [A-Z][a-z]+/g, // Names like "Thomas Wernerheim"
    /Microsoft [A-Z][a-z]+/g,    // Microsoft products
    /Adobe [A-Z][a-z]+/g,        // Adobe products
    /\b[A-Z][a-z]{2,}\.(docx?|pdf|txt)/g, // File names
    /\b[A-Z][a-z]{3,}[:\s][A-Z][a-z]+/g   // Labels and values
  ];
  
  for (const pattern of metadataPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      patterns.push(...matches);
    }
  }
  
  // Extract any remaining readable chunks
  const readableChunks = text.match(/[A-Za-z]{3,}(?:\s+[A-Za-z]{3,}){1,5}/g);
  if (readableChunks) {
    patterns.push(...readableChunks);
  }
  
  return [...new Set(patterns)].join(' ').trim();
}

// Clean and normalize extracted text
export function extractTextByLineBreaks(text: string): string {
  const cleanedWords = extractReadableWords(text);
  return cleanedWords.join(' ');
}

// Extract text using pattern matching
export function extractTextPatterns(text: string): string {
  return extractMeaningfulPatterns(text);
}

// Extract text from parentheses patterns
export function extractTextFromParentheses(text: string): string {
  const parenthesesMatches = text.match(/\([^)]+\)/g);
  if (!parenthesesMatches) return '';
  
  const readableWords: string[] = [];
  
  for (const match of parenthesesMatches) {
    const content = match.slice(1, -1); // Remove parentheses
    const words = extractReadableWords(content);
    readableWords.push(...words);
  }
  
  return readableWords.join(' ');
}

// Check if text contains binary indicators
export function textContainsBinaryIndicators(text: string): boolean {
  // Check for high ratio of non-printable characters
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\xFF]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  
  // Check for Unicode replacement characters
  const replacementChars = text.match(/\uFFFD/g);
  const replacementRatio = replacementChars ? replacementChars.length / text.length : 0;
  
  // Check for suspicious character sequences
  const suspiciousSequences = text.match(/[^\x20-\x7E\r\n\t]{3,}/g);
  const suspiciousRatio = suspiciousSequences ? suspiciousSequences.length : 0;
  
  return ratio > 0.05 || replacementRatio > 0.01 || suspiciousRatio > 2;
}
