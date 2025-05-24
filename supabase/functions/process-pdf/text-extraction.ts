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
  let extractedText = '';
  
  console.log("Starting enhanced PDF text extraction");
  
  // Strategy 1: Look for actual text content in streams
  const streamMatches = pdfBytes.match(/stream\s*([\s\S]*?)\s*endstream/g);
  if (streamMatches) {
    console.log(`Found ${streamMatches.length} content streams`);
    
    for (const streamMatch of streamMatches) {
      const streamContent = streamMatch.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
      
      // Look for text drawing operations in the stream
      const textOperations = extractTextFromStream(streamContent);
      if (textOperations.length > 0) {
        extractedText += textOperations + ' ';
      }
    }
  }
  
  // Strategy 2: Look for text in parentheses (Tj operators)
  const tjMatches = pdfBytes.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)\s*Tj/g);
  if (tjMatches) {
    console.log(`Found ${tjMatches.length} Tj text operations`);
    
    for (const match of tjMatches) {
      const textContent = match.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
      if (textContent) {
        const cleanText = cleanTextContent(textContent);
        if (cleanText.length > 0) {
          extractedText += cleanText + ' ';
        }
      }
    }
  }
  
  // Strategy 3: Look for text arrays (TJ operators)
  const tjArrayMatches = pdfBytes.match(/\[((?:[^\[\]\\]|\\.|\\[0-7]{3})*)\]\s*TJ/g);
  if (tjArrayMatches) {
    console.log(`Found ${tjArrayMatches.length} TJ array operations`);
    
    for (const match of tjArrayMatches) {
      const arrayContent = match.match(/\[((?:[^\[\]\\]|\\.|\\[0-7]{3})*)\]/)?.[1];
      if (arrayContent) {
        // Extract text from array elements
        const textElements = arrayContent.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/g);
        if (textElements) {
          for (const element of textElements) {
            const textContent = element.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
            if (textContent) {
              const cleanText = cleanTextContent(textContent);
              if (cleanText.length > 0) {
                extractedText += cleanText + ' ';
              }
            }
          }
        }
      }
    }
  }
  
  // Strategy 4: Extract text from BT/ET blocks (text objects)
  const textBlocks = pdfBytes.match(/BT\s*([\s\S]*?)\s*ET/g);
  if (textBlocks) {
    console.log(`Found ${textBlocks.length} text blocks`);
    
    for (const block of textBlocks) {
      const blockContent = block.replace(/^BT\s*/, '').replace(/\s*ET$/, '');
      const blockText = extractTextFromTextBlock(blockContent);
      if (blockText.length > 0) {
        extractedText += blockText + ' ';
      }
    }
  }
  
  // If we still don't have meaningful text, try a more aggressive approach
  if (extractedText.length < 50) {
    console.log("Trying aggressive text extraction");
    extractedText = aggressiveTextExtraction(pdfBytes);
  }
  
  console.log(`Extracted text length: ${extractedText.length}`);
  return extractedText.trim();
}

// Extract text from a stream content
function extractTextFromStream(streamContent: string): string {
  let text = '';
  
  // Remove common PDF filters and decode if possible
  let decodedContent = streamContent;
  
  // Look for text operations in the decoded stream
  const textMatches = decodedContent.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)\s*Tj/g);
  if (textMatches) {
    for (const match of textMatches) {
      const textContent = match.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
      if (textContent) {
        const cleanText = cleanTextContent(textContent);
        if (cleanText.length > 0) {
          text += cleanText + ' ';
        }
      }
    }
  }
  
  return text;
}

// Extract text from a text block (BT...ET)
function extractTextFromTextBlock(blockContent: string): string {
  let text = '';
  
  // Look for Tj operations
  const tjMatches = blockContent.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)\s*Tj/g);
  if (tjMatches) {
    for (const match of tjMatches) {
      const textContent = match.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
      if (textContent) {
        const cleanText = cleanTextContent(textContent);
        if (cleanText.length > 0) {
          text += cleanText + ' ';
        }
      }
    }
  }
  
  // Look for TJ operations
  const tjArrayMatches = blockContent.match(/\[((?:[^\[\]\\]|\\.|\\[0-7]{3})*)\]\s*TJ/g);
  if (tjArrayMatches) {
    for (const match of tjArrayMatches) {
      const arrayContent = match.match(/\[((?:[^\[\]\\]|\\.|\\[0-7]{3})*)\]/)?.[1];
      if (arrayContent) {
        const textElements = arrayContent.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/g);
        if (textElements) {
          for (const element of textElements) {
            const textContent = element.match(/\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/)?.[1];
            if (textContent) {
              const cleanText = cleanTextContent(textContent);
              if (cleanText.length > 0) {
                text += cleanText + ' ';
              }
            }
          }
        }
      }
    }
  }
  
  return text;
}

// Clean and decode text content
function cleanTextContent(text: string): string {
  if (!text) return '';
  
  // Handle escape sequences
  let cleaned = text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
    
  // Handle octal escape sequences
  cleaned = cleaned.replace(/\\([0-7]{1,3})/g, (match, octal) => {
    const charCode = parseInt(octal, 8);
    return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : ' ';
  });
  
  // Remove non-printable characters but keep basic whitespace
  cleaned = cleaned.replace(/[^\x20-\x7E\r\n\t]/g, ' ');
  
  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Only return if it looks like actual text
  if (cleaned.length >= 2 && /[a-zA-Z]/.test(cleaned)) {
    return cleaned;
  }
  
  return '';
}

// Aggressive text extraction as last resort
function aggressiveTextExtraction(pdfBytes: string): string {
  console.log("Using aggressive text extraction");
  
  let text = '';
  
  // Look for any parentheses content that might be text
  const allParentheses = pdfBytes.match(/\([^)]{2,}\)/g);
  if (allParentheses) {
    for (const match of allParentheses) {
      const content = match.slice(1, -1); // Remove parentheses
      const cleanText = cleanTextContent(content);
      if (cleanText.length > 0 && isLikelyText(cleanText)) {
        text += cleanText + ' ';
      }
    }
  }
  
  // Look for metadata fields that might contain readable text
  const titleMatch = pdfBytes.match(/\/Title\s*\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/);
  if (titleMatch) {
    const title = cleanTextContent(titleMatch[1]);
    if (title.length > 0) {
      text += `Title: ${title}\n`;
    }
  }
  
  const authorMatch = pdfBytes.match(/\/Author\s*\(((?:[^()\\]|\\.|\\[0-7]{3})*)\)/);
  if (authorMatch) {
    const author = cleanTextContent(authorMatch[1]);
    if (author.length > 0) {
      text += `Author: ${author}\n`;
    }
  }
  
  return text.trim();
}

// Check if text looks like actual readable content
function isLikelyText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Must contain at least some letters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / text.length;
  
  // Should have reasonable letter ratio and not be too short
  return letterRatio >= 0.5 && text.length >= 3;
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
  const nonPrintable = text.match(/[\x00-\x1F\x7F-\x9F]/g);
  const ratio = nonPrintable ? nonPrintable.length / text.length : 0;
  
  // Check for Unicode replacement characters
  const replacementChars = text.match(/\uFFFD/g);
  const replacementRatio = replacementChars ? replacementChars.length / text.length : 0;
  
  // Check for suspicious character sequences
  const suspiciousSequences = text.match(/[^\x20-\x7E\r\n\t]{3,}/g);
  const suspiciousRatio = suspiciousSequences ? suspiciousSequences.length : 0;
  
  return ratio > 0.05 || replacementRatio > 0.01 || suspiciousRatio > 2;
}
