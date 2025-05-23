// PDF text extraction utility functions

// Helper for detecting PDF format
export function isPdfData(bytes: string): boolean {
  return bytes.substring(0, 8).includes("%PDF");
}

// Extract text by looking for patterns of likely words
export function extractTextPatterns(pdfBytes: string): string {
  try {
    // Look for text that follows patterns of English words and sentences
    const textPatterns = [
      // Words with 3+ letters followed by spaces or punctuation
      /([A-Za-z]{3,}[\s.,;:!?]+){3,}/g,
      
      // Capitalized words (likely proper nouns or sentence starts)
      /([A-Z][a-z]{2,}[\s.,;:!?]+){2,}/g,
      
      // Common sentence structures
      /([A-Z][a-z]{1,}[\s][a-z]+[\s][a-z]+[\s.,;:!?])/g
    ];
    
    let extractedText = "";
    
    for (const pattern of textPatterns) {
      const matches = pdfBytes.match(pattern);
      if (matches && matches.length > 0) {
        // Join matches with spacing
        const matchText = matches.join(" ").replace(/\s+/g, " ");
        
        // If we found significant text, use it
        if (matchText.length > extractedText.length) {
          extractedText = matchText;
        }
      }
    }
    
    return extractedText;
  } catch (error) {
    console.error("Error extracting text patterns:", error);
    return "";
  }
}

// Extract text from PDF streams
export function extractTextFromStreams(pdfBytes: string): string {
  try {
    const textStreamPattern = /stream\s([\s\S]*?)\sendstream/g;
    const textStreams = [...pdfBytes.matchAll(textStreamPattern)];
    
    if (!textStreams || textStreams.length === 0) {
      return "";
    }
    
    console.log(`Found ${textStreams.length} text streams`);
    
    // Take the longest streams as they likely contain the main text
    const sortedStreams = textStreams
      .map(match => match[1])
      .filter(stream => stream.length > 50)
      .sort((a, b) => b.length - a.length)
      .slice(0, 10); // Take top 10 longest streams
    
    if (sortedStreams.length === 0) {
      return "";
    }
    
    let streamText = "";
    
    for (const stream of sortedStreams) {
      // Look for text patterns in the stream
      const potentialText = stream.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim();
      
      if (potentialText.length > 100 && 
          (potentialText.split(' ').length > 20)) {
        streamText += potentialText + "\n\n";
      }
    }
    
    return streamText;
  } catch (error) {
    console.error("Error extracting text from streams:", error);
    return "";
  }
}

// Extract text by examining line breaks and spacing patterns
export function extractTextByLines(pdfBytes: string): string {
  try {
    // Extract strings that might be text lines based on common PDF text encodings
    const linePatterns = [
      // Common PDF text encoding patterns
      /\(([^\)]{5,})\)/g,  // Text in parentheses (common in PDF)
      /BT\s*(.*?)\s*ET/gs, // Text between Begin Text and End Text markers
      /TJ\s*\[(.*?)\]/gs,  // Text array in TJ operators
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
  
  // Stage 4: As last resort, extract all letter sequences
  const letterSequences = stage1.match(/[A-Za-z]{3,}/g);
  if (letterSequences && letterSequences.length > 10) {
    return letterSequences.join(' ');
  }
  
  return stage1;
}

// Wrapper that tries all extraction methods
async function extractTextCombinedMethods(pdfBytes: string): Promise<string> {
  // Try each method in order of reliability and take the best result
  const results = [];
  
  // Method 1: Text Objects (usually most reliable)
  const textObjectsResult = extractTextFromTextObjects(pdfBytes);
  if (textObjectsResult && textObjectsResult.length > 100) {
    const cleaned = cleanAndNormalizeText(textObjectsResult);
    results.push({ text: cleaned, method: 'textObjects', score: cleaned.length * 1.2 });
  }
  
  // Method 2: Streams
  const streamsResult = extractTextFromStreams(pdfBytes);
  if (streamsResult && streamsResult.length > 100) {
    const cleaned = cleanAndNormalizeText(streamsResult);
    results.push({ text: cleaned, method: 'streams', score: cleaned.length });
  }
  
  // Method 3: Line-based extraction
  const lineResult = extractTextByLines(pdfBytes);
  if (lineResult && lineResult.length > 100) {
    const cleaned = cleanAndNormalizeText(lineResult);
    results.push({ text: cleaned, method: 'lines', score: cleaned.length * 1.1 });
  }
  
  // Method 4: Pattern-based as last resort
  const patternResult = extractTextPatterns(pdfBytes);
  if (patternResult && patternResult.length > 100) {
    const cleaned = cleanAndNormalizeText(patternResult);
    results.push({ text: cleaned, method: 'patterns', score: cleaned.length });
  }
  
  // Method 5: Parentheses
  const parenthesesResult = extractTextFromParentheses(pdfBytes);
  if (parenthesesResult && parenthesesResult.length > 100) {
    const cleaned = cleanAndNormalizeText(parenthesesResult);
    results.push({ text: cleaned, method: 'parentheses', score: cleaned.length });
  }
  
  // If we have results, select the best one based on score
  if (results.length > 0) {
    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);
    
    // Log the winning method
    console.log(`Best extraction method: ${results[0].method} with score ${results[0].score}`);
    
    // Return the text from the best method
    return results[0].text;
  }
  
  // If nothing worked, return empty string
  return "No text could be extracted. The document may be image-based or protected.";
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
  
  // If any pattern is found, consider it binary
  return binaryPatterns.some(pattern => pattern.test(text));
}
