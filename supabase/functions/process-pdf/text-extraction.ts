// PDF text extraction utility functions

// Helper for detecting PDF format
export function isPdfData(bytes: string): boolean {
  return bytes.substring(0, 8).includes("%PDF");
}

// Enhanced text extraction that focuses on actual document content
export function extractReadableText(pdfBytes: string): string {
  try {
    // Step 1: Look for actual text content in various PDF text operators
    const textOperators = [
      // Text showing operators with actual content - Fixed regex patterns
      /\(((?:[^()\\]|\\.)*)\)\s*Tj/g,           // Simple text show
      /\[((?:[^\[\]\\]|\\.)*)\]\s*TJ/g,        // Array text show
      /\(((?:[^()\\]|\\.)*)\)\s*'/g,           // Single quote text show
      /\(((?:[^()\\]|\\.)*)\)\s*"/g,           // Double quote text show
    ];
    
    let extractedText = "";
    
    for (const operator of textOperators) {
      const matches = [...pdfBytes.matchAll(operator)];
      if (matches && matches.length > 0) {
        console.log(`Found ${matches.length} text elements with operator`);
        
        for (const match of matches) {
          let text = match[1];
          if (text && text.length > 2) {
            // Clean and decode the text
            text = decodeTextContent(text);
            if (isReadableText(text)) {
              extractedText += text + " ";
            }
          }
        }
      }
    }
    
    // Step 2: If we got good readable text, return it
    if (extractedText.length > 50 && hasEnoughWords(extractedText)) {
      return cleanExtractedText(extractedText);
    }
    
    // Step 3: Try to extract from content streams
    const streamText = extractFromContentStreams(pdfBytes);
    if (streamText && streamText.length > 50) {
      return streamText;
    }
    
    // Step 4: Look for Unicode text patterns
    const unicodeText = extractUnicodeText(pdfBytes);
    if (unicodeText && unicodeText.length > 50) {
      return unicodeText;
    }
    
    // Step 5: Extract any readable word patterns as last resort
    return extractWordPatterns(pdfBytes);
    
  } catch (error) {
    console.error("Error in enhanced text extraction:", error);
    return "";
  }
}

// Decode PDF text content with proper escape handling - Fixed regex
function decodeTextContent(text: string): string {
  try {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\\(/g, '(')          // Fixed: escaped parentheses
      .replace(/\\\)/g, ')')          // Fixed: escaped parentheses
      .replace(/\\\\/g, '\\')
      .replace(/\\(\d{3})/g, (_, octal) => {
        const charCode = parseInt(octal, 8);
        return charCode > 31 && charCode < 127 ? String.fromCharCode(charCode) : '';
      });
  } catch (error) {
    return text;
  }
}

// Check if text looks like readable content
function isReadableText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Check for reasonable ratio of letters to total characters
  const letters = text.match(/[a-zA-Z]/g);
  const letterRatio = letters ? letters.length / text.length : 0;
  
  // Must have at least 50% letters and not be all uppercase/lowercase
  return letterRatio > 0.5 && 
         !/^[A-Z\s\d]*$/.test(text) && 
         !/^[a-z\s\d]*$/.test(text) &&
         !text.includes('findresource') &&
         !text.includes('begincmap') &&
         !text.includes('endcmap');
}

// Check if we have enough meaningful words
function hasEnoughWords(text: string): boolean {
  const words = text.split(/\s+/).filter(word => 
    word.length >= 3 && /^[a-zA-Z]/.test(word)
  );
  return words.length >= 5;
}

// Extract text from PDF content streams with better filtering
function extractFromContentStreams(pdfBytes: string): string {
  try {
    // Look for content streams that contain actual text
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
    const streams = [...pdfBytes.matchAll(streamPattern)];
    
    let bestText = "";
    
    for (const [_, streamContent] of streams) {
      // Skip streams that look like font definitions or images
      if (streamContent.includes('findresource') || 
          streamContent.includes('begincmap') ||
          streamContent.includes('ImageI') ||
          streamContent.includes('CCITTFax')) {
        continue;
      }
      
      // Look for text content in this stream
      const textInStream = extractTextFromStream(streamContent);
      if (textInStream && textInStream.length > bestText.length) {
        bestText = textInStream;
      }
    }
    
    return bestText;
  } catch (error) {
    console.error("Error extracting from content streams:", error);
    return "";
  }
}

// Extract text from a single content stream
function extractTextFromStream(streamContent: string): string {
  try {
    // Look for text between BT and ET (Begin Text/End Text)
    const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
    const textBlocks = [...streamContent.matchAll(btEtPattern)];
    
    let streamText = "";
    
    for (const [_, blockContent] of textBlocks) {
      // Extract text from various text operators in this block
      const textPatterns = [
        /\(((?:[^()\\]|\\.)+)\)\s*Tj/g,
        /\[((?:[^\[\]\\]|\\.)+)\]\s*TJ/g,
        /\(((?:[^()\\]|\\.)+)\)\s*'/g,
      ];
      
      for (const pattern of textPatterns) {
        const matches = [...blockContent.matchAll(pattern)];
        for (const match of matches) {
          const text = decodeTextContent(match[1]);
          if (isReadableText(text)) {
            streamText += text + " ";
          }
        }
      }
    }
    
    return cleanExtractedText(streamText);
  } catch (error) {
    console.error("Error extracting text from stream:", error);
    return "";
  }
}

// Extract Unicode text patterns
function extractUnicodeText(pdfBytes: string): string {
  try {
    // Look for Unicode strings (typically in parentheses)
    const unicodePattern = /\(([^)]{10,})\)/g;
    const matches = [...pdfBytes.matchAll(unicodePattern)];
    
    let unicodeText = "";
    
    for (const match of matches) {
      const text = decodeTextContent(match[1]);
      if (isReadableText(text) && text.length > 5) {
        unicodeText += text + " ";
      }
    }
    
    return cleanExtractedText(unicodeText);
  } catch (error) {
    console.error("Error extracting Unicode text:", error);
    return "";
  }
}

// Extract readable word patterns as last resort
function extractWordPatterns(pdfBytes: string): string {
  try {
    // Look for sequences that look like English words
    const wordPattern = /\b[A-Za-z]{3,}(?:\s+[A-Za-z]{2,}){2,}\b/g;
    const matches = pdfBytes.match(wordPattern);
    
    if (matches && matches.length > 5) {
      return matches
        .filter(match => !match.includes('findresource') && !match.includes('begincmap'))
        .join(' ');
    }
    
    return "";
  } catch (error) {
    console.error("Error extracting word patterns:", error);
    return "";
  }
}

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  if (!text) return "";
  
  return text
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // Remove non-printable chars
    .replace(/\s+/g, ' ')           // Normalize again
    .trim();
}

// Legacy functions for backward compatibility
export function extractTextPatterns(pdfBytes: string): string {
  return extractReadableText(pdfBytes);
}

export function extractTextFromStreams(pdfBytes: string): string {
  return extractFromContentStreams(pdfBytes);
}

export function extractTextFromBTETBlocks(pdfBytes: string): string {
  try {
    const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
    const btEtBlocks = [...pdfBytes.matchAll(btEtPattern)];
    
    if (!btEtBlocks || btEtBlocks.length === 0) {
      console.log("No BT/ET blocks found");
      return "";
    }
    
    console.log(`Found ${btEtBlocks.length} BT/ET text blocks`);
    
    let extractedText = "";
    
    for (const [_, blockContent] of btEtBlocks) {
      // Use our enhanced extraction
      const blockText = extractTextFromStream(blockContent);
      if (blockText) {
        extractedText += blockText + " ";
      }
    }
    
    return cleanExtractedText(extractedText);
  } catch (error) {
    console.error("Error extracting text from BT/ET blocks:", error);
    return "";
  }
}

// Extract text by examining line breaks and spacing patterns
export function extractTextByLines(pdfBytes: string): string {
  try {
    // Extract strings that might be text lines based on common PDF text encodings
    const linePatterns = [
      // Common PDF text encoding patterns
      /\(([^)]{5,})\)/g,  // Text in parentheses (common in PDF)
      /BT\s*(.*?)\s*ET/gs, // Text between Begin Text and End Text markers
      /TJ\s*\[(.*?)\]/gs,  // Text array in TJ operators
      /Td\s*\((.*?)\)\s*Tj/gs, // Text with Td and Tj operators
    ];
    
    let lines: string[] = [];
    
    // Try each pattern
    for (const pattern of linePatterns) {
      const matches = [...pdfBytes.matchAll(pattern)];
      if (matches && matches.length > 10) {
        console.log(`Found ${matches.length} potential text lines using pattern`);
        
        // Extract the matched groups and process them
        const extractedLines = matches.map(match => match[1] || match[0])
          .filter(line => line.length >= 5)  // Filter out very short lines
          .map(line => {
            // Clean up line text
            return line
              .replace(/\\n/g, ' ')
              .replace(/\\r/g, '')
              .replace(/\\\\/g, '')
              .replace(/\\t/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          })
          .filter(line => {
            // Keep lines that contain alphabetic characters
            return /[A-Za-z]{3,}/.test(line);
          });
        
        if (extractedLines.length > lines.length) {
          lines = extractedLines;
        }
      }
    }
    
    // Additional extraction method - look for text directly after TJ commands
    const tjTextPattern = /TJ[\s\n\r]*\[(.*?)\]/gs;
    const tjMatches = [...pdfBytes.matchAll(tjTextPattern)];
    if (tjMatches && tjMatches.length > 0) {
      const tjTexts = tjMatches.map(match => {
        // Extract text parts from TJ arrays - these often contain actual text
        const tjContent = match[1];
        // Look for text in parentheses within TJ array
        const textParts = [...tjContent.matchAll(/\(([^)]*)\)/g)]
          .map(m => m[1])
          .filter(text => text.length > 0);
          
        return textParts.join(' ');
      }).filter(text => text.length > 0);
      
      if (tjTexts.length > 10) {
        console.log(`Found ${tjTexts.length} text fragments from TJ operators`);
        lines = [...lines, ...tjTexts];
      }
    }
    
    // Join the lines with proper spacing
    return lines.join('\n');
  } catch (error) {
    console.error("Error extracting text by lines:", error);
    return "";
  }
}

// Extract text using parenthesized text objects
export function extractTextFromTextObjects(pdfBytes: string): string {
  try {
    const textObjectPattern = /BT\s*(.*?)\s*ET/gs;
    const textObjects = [...pdfBytes.matchAll(textObjectPattern)];
    
    if (!textObjects || textObjects.length === 0) {
      return "";
    }
    
    console.log(`Found ${textObjects.length} text objects`);
    
    let objectText = "";
    for (const [_, content] of textObjects) {
      // Extract text strings
      const textMatches = content.match(/\((.*?)\)/g);
      if (textMatches) {
        for (const match of textMatches) {
          // Remove parentheses and decode PDF escape sequences
          let text = match.substring(1, match.length - 1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\\\/g, '\\')
            .replace(/\\t/g, '\t')
            .replace(/\\(\d{3})/g, (_, octal) => 
              String.fromCharCode(parseInt(octal, 8))
            );
          
          // Add space between text fragments that likely need it
          if (objectText.length > 0 && 
              !objectText.endsWith(' ') && 
              !objectText.endsWith('\n') && 
              !text.startsWith(' ') && 
              !text.startsWith('\n')) {
            objectText += ' ';
          }
          
          objectText += text;
        }
      }
    }
    
    // If we found good text, return it
    if (objectText.length > 100) {
      return objectText;
    }
    
    // Otherwise try another extraction method - search for letters after operator codes
    const letterSequencePattern = /\)(Td|Tj|TJ|Tf|Tc|Tw|Ts|Tz|Tm|T\*)[^)]+\(/gs;
    const letterMatches = pdfBytes.match(letterSequencePattern);
    
    if (letterMatches && letterMatches.length > 10) {
      // Process and join matches
      return letterMatches
        .map(match => match.replace(/\)(Td|Tj|TJ|Tf|Tc|Tw|Ts|Tz|Tm|T\*)|\(/g, ' '))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    return objectText;
  } catch (error) {
    console.error("Error extracting text from text objects:", error);
    return "";
  }
}

// Extract text from parenthetical strings
export function extractTextFromParentheses(pdfBytes: string): string {
  try {
    const textMatches = pdfBytes.match(/\(([^)]{3,})\)/g);
    if (!textMatches || textMatches.length === 0) {
      return "";
    }
    
    console.log(`Found ${textMatches.length} text matches in parentheses`);
    
    // Filter and clean text
    const processedMatches = textMatches
      .map(match => {
        try {
          // Remove the surrounding parentheses and decode PDF escapes
          return match.substring(1, match.length - 1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\\\/g, '\\')
            .replace(/\\t/g, '\t')
            .replace(/\\(\d{3})/g, (_, octal) => 
              String.fromCharCode(parseInt(octal, 8))
            );
        } catch (e) {
          return '';
        }
      })
      .filter(text => /[a-zA-Z0-9]/.test(text) && text.length > 2);
    
    // Join text with intelligent spacing
    let joinedText = "";
    let prevTextEndsWithWordBreak = true;
    
    for (const text of processedMatches) {
      const startsWithWordBreak = /^[.,;:!? ]/.test(text);
      
      if (!prevTextEndsWithWordBreak && !startsWithWordBreak) {
        joinedText += " " + text;
      } else {
        joinedText += text;
      }
      
      prevTextEndsWithWordBreak = /[.,;:!? ]$/.test(text);
    }
    
    // Additional step: extract actual words
    if (joinedText.length > 100) {
      const words = joinedText.match(/[A-Za-z]{3,}[A-Za-z\s.,;:!?]*/g);
      if (words && words.length > 20) {
        return words.join(' ');
      }
    }
    
    return joinedText;
  } catch (error) {
    console.error("Error extracting text from parentheses:", error);
    return "";
  }
}

// Get PDF metadata from the document
export function extractPdfMetadata(pdfBytes: string) {
  try {
    // Try to detect PDF version
    const pdfVersion = pdfBytes.substring(0, 10).match(/PDF-(\d+\.\d+)/);
    console.log(`PDF version detected: ${pdfVersion ? pdfVersion[1] : 'unknown'}`);
    
    // Find text encoding declaration
    let encodingMatch = pdfBytes.match(/\/Encoding\s*\/([A-Za-z0-9-]+)/);
    let encoding = encodingMatch ? encodingMatch[1] : "StandardEncoding";
    console.log(`PDF encoding detected: ${encoding}`);
    
    // Count PDF pages (very approximate)
    const pageMarkers = pdfBytes.match(/\/Page\s*<<.*?>>/g);
    const pageCount = pageMarkers ? pageMarkers.length : Math.max(1, Math.floor(pdfBytes.length / 5000));
    console.log(`Estimated ${pageCount} pages in document`);
    
    return {
      version: pdfVersion ? pdfVersion[1] : 'unknown',
      encoding,
      pageCount
    };
  } catch (error) {
    console.error("Error extracting PDF metadata:", error);
    return {
      version: 'unknown',
      encoding: 'unknown',
      pageCount: 1
    };
  }
}

// Combine extraction methods with timeout handling
export async function extractTextWithTimeout(pdfBytes: string, timeoutMs: number = 30000): Promise<string> {
  // Use Promise.race to implement a timeout
  return Promise.race([
    extractTextCombinedMethods(pdfBytes),
    new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`PDF text extraction timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    })
  ]);
}

// Clean and normalize text to remove binary data indicators
export function cleanAndNormalizeText(text: string): string {
  if (!text || text.length === 0) return text;
  
  // Multi-stage cleaning approach
  
  // Stage 1: Remove binary and control characters
  const stage1 = text.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
                    .replace(/[^\x20-\x7E\r\n\t\u00A0-\u00FF]/g, ' ')
                    .replace(/\uFFFD/g, ' ');
  
  // Stage 2: Focus on extracting meaningful words (with 3+ alphabetic chars)
  const words = stage1.split(/\s+/)
    .filter(word => word.length >= 3 && /[a-zA-Z]{2,}/.test(word))
    .join(' ');
    
  // If we found enough words, use that as our text
  if (words.length > stage1.length / 3 || words.length > 200) {
    return words;
  }
  
  // Stage 3: Look for paragraph-like structures
  const paragraphs = stage1.match(/[A-Za-z][^.!?]{10,}[.!?]/g);
  if (paragraphs && paragraphs.length > 0) {
    return paragraphs.join(' ');
  }
  
  // Stage 4: Look for any text with letters
  const letterSequences = stage1.match(/[A-Za-z]{3,}/g);
  if (letterSequences && letterSequences.length > 10) {
    return letterSequences.join(' ');
  }
  
  // Stage 5: Ultra aggressive - strip everything but letters and spaces
  return stage1.replace(/[^A-Za-z\s]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
}

// Function to check if the extracted text looks like binary data
export function textContainsBinaryIndicators(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Check for common indicators of binary/corrupted text
  const binaryPatterns = [
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/,   // Control characters
    /[\uD800-\uDFFF\uFFFE\uFFFF]/,             // Invalid unicode
    /[Ý|î|ò|ô|Ð|ð|Þ|þ|±|×|÷|§|¥|®|©]/,         // Common binary artifacts
    /[\u0080-\u009F]/                          // More control characters
  ];
  
  // Sample the text for better performance
  const sampleSize = Math.min(text.length, 1000);
  const sample = text.substring(0, sampleSize);
  
  // If any pattern is found, consider it binary
  for (const pattern of binaryPatterns) {
    if (pattern.test(sample)) {
      return true;
    }
  }
  
  // Also check for unusual character distribution
  const letters = sample.match(/[a-zA-Z]/g);
  const letterRatio = letters ? letters.length / sample.length : 0;
  
  // Very low letter ratio suggests binary data
  return letterRatio < 0.2;
}

// NEW: Enhanced wrapper that tries all extraction methods with focus on readable content
async function extractTextCombinedMethods(pdfBytes: string): Promise<string> {
  // Method 1: Enhanced readable text extraction (highest priority)
  const readableResult = extractReadableText(pdfBytes);
  if (readableResult && readableResult.length > 100 && hasEnoughWords(readableResult)) {
    console.log(`Enhanced extraction found readable text: ${readableResult.length} chars`);
    return readableResult;
  }
  
  // Method 2: BT/ET blocks with enhanced processing
  const btEtResult = extractTextFromBTETBlocks(pdfBytes);
  if (btEtResult && btEtResult.length > 100 && hasEnoughWords(btEtResult)) {
    console.log(`Enhanced BT/ET extraction found readable text: ${btEtResult.length} chars`);
    return btEtResult;
  }
  
  // Method 3: Content streams
  const streamsResult = extractFromContentStreams(pdfBytes);
  if (streamsResult && streamsResult.length > 100) {
    console.log(`Stream extraction found text: ${streamsResult.length} chars`);
    return streamsResult;
  }
  
  // Method 4: Unicode text
  const unicodeResult = extractUnicodeText(pdfBytes);
  if (unicodeResult && unicodeResult.length > 50) {
    console.log(`Unicode extraction found text: ${unicodeResult.length} chars`);
    return unicodeResult;
  }
  
  // Method 5: Word patterns as last resort
  const patternResult = extractWordPatterns(pdfBytes);
  if (patternResult && patternResult.length > 50) {
    console.log(`Pattern extraction found text: ${patternResult.length} chars`);
    return patternResult;
  }
  
  // If nothing worked, return a clear message
  return "No readable text could be extracted. This PDF may contain only images, have complex formatting, or use unsupported fonts.";
}

// Re-export legacy functions for compatibility
export function extractTextByLines(pdfBytes: string): string {
  return extractReadableText(pdfBytes);
}

export function extractTextFromTextObjects(pdfBytes: string): string {
  return extractFromContentStreams(pdfBytes);
}

export function extractTextFromParentheses(pdfBytes: string): string {
  return extractUnicodeText(pdfBytes);
}
