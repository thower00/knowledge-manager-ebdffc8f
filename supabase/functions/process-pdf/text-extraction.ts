// PDF text extraction utility functions

// Helper for detecting PDF format
export function isPdfData(bytes: string): boolean {
  return bytes.substring(0, 8).includes("%PDF");
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

// Attempt to extract text with different encodings
export function extractTextWithEncodings(pdfBytes: string): string {
  try {
    // Approach 1: UTF-16BE (often used in PDFs)
    let utf16Text = "";
    try {
      // Extract potential UTF-16BE text
      const utf16Regex = /0(\w)0(\w)/g;
      const utf16Matches = [...pdfBytes.matchAll(utf16Regex)];
      if (utf16Matches && utf16Matches.length > 100) {
        let chars = [];
        for (const [_, byte1, byte2] of utf16Matches) {
          const charCode = parseInt(byte1 + byte2, 16);
          if (charCode >= 32 && charCode <= 126) {
            chars.push(String.fromCharCode(charCode));
          }
        }
        utf16Text = chars.join('');
        
        // Clean up and filter
        const words = utf16Text.split(/\s+/).filter(word => word.length >= 3);
        if (words.length > 50) {
          console.log("Successfully extracted text using UTF-16BE pattern matching");
          return words.join(' ');
        }
      }
    } catch (e) {
      console.error("UTF-16BE extraction failed", e);
    }
    
    // Approach 2: Latin-1 (ISO-8859-1) decoding
    try {
      console.log("Trying Latin-1 decoding with improved filtering");
      
      // Process in chunks to handle large documents
      const chunkSize = 10000;
      let latinText = "";
      
      for (let startPos = 0; startPos < pdfBytes.length; startPos += chunkSize) {
        const endPos = Math.min(startPos + chunkSize, pdfBytes.length);
        const chunk = pdfBytes.substring(startPos, endPos);
        
        // Better character filtering - keep alphabets, numbers, punctuation
        let chunkText = "";
        for (let i = 0; i < chunk.length; i++) {
          const charCode = chunk.charCodeAt(i) & 0xFF;
          // Accept common Latin characters, numbers, and punctuation
          if ((charCode >= 65 && charCode <= 90) ||   // A-Z
              (charCode >= 97 && charCode <= 122) ||  // a-z
              (charCode >= 48 && charCode <= 57) ||   // 0-9
              (charCode === 32) ||                    // space
              (charCode >= 33 && charCode <= 46) ||   // punctuation
              (charCode === 10) || (charCode === 13) || (charCode === 9)) { // newlines, tab
            chunkText += String.fromCharCode(charCode);
          } else {
            chunkText += ' ';
          }
        }
        
        // Add to overall text
        latinText += chunkText;
      }
      
      // Process the latinText to merge words correctly
      latinText = latinText.replace(/\s+/g, ' ').trim();
      
      // Check if we got meaningful text
      const words = latinText.split(/\s+/).filter(word => 
        word.length >= 3 && /[a-zA-Z]{2,}/.test(word)
      );
      
      if (words.length > 50) {
        console.log("Successfully extracted text using improved Latin-1 decoding");
        return words.join(' ');
      }
    } catch (error) {
      console.error("Error in Latin-1 decoding:", error);
    }
    
    // Approach 3: Character frequency analysis
    try {
      console.log("Trying character frequency analysis as last resort");
      
      // Create a frequency map of characters in the document
      const charFrequency = new Map();
      for (let i = 0; i < pdfBytes.length; i++) {
        const char = pdfBytes.charAt(i);
        charFrequency.set(char, (charFrequency.get(char) || 0) + 1);
      }
      
      // Sort characters by frequency (most common first)
      const sortedChars = [...charFrequency.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([char, _]) => char);
      
      // Keep only the most common characters that look like text
      const likelyTextChars = sortedChars
        .filter(char => {
          const code = char.charCodeAt(0);
          return (code >= 32 && code <= 126) || // ASCII printable
                 (code === 9 || code === 10 || code === 13); // Tab, LF, CR
        })
        .slice(0, 75); // Keep top 75 most common text characters
      
      // Build a set of acceptable characters
      const validChars = new Set(likelyTextChars);
      
      // Extract text using only the most common characters
      let freqText = "";
      for (let i = 0; i < pdfBytes.length; i++) {
        const char = pdfBytes.charAt(i);
        if (validChars.has(char)) {
          freqText += char;
        } else {
          // Replace with space if not in our accepted set
          freqText += ' ';
        }
      }
      
      // Clean up the text
      freqText = freqText.replace(/\s+/g, ' ').trim();
      
      // See if we have enough meaningful words
      const words = freqText.split(/\s+/).filter(word => 
        word.length >= 3 && /[a-zA-Z]{2,}/.test(word)
      );
      
      if (words.length > 50) {
        console.log("Successfully extracted text using character frequency analysis");
        return words.join(' ');
      }
    } catch (error) {
      console.error("Error in frequency analysis:", error);
    }
    
    return "";
  } catch (error) {
    console.error("Error in encoding extraction:", error);
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

// Wrapper that tries all extraction methods
async function extractTextCombinedMethods(pdfBytes: string): Promise<string> {
  // Try each method in order of reliability and take the best result
  const results = [];
  
  // Method 1: Text Objects
  const textObjectsResult = extractTextFromTextObjects(pdfBytes);
  if (textObjectsResult && textObjectsResult.length > 100) {
    results.push({ text: textObjectsResult, method: 'textObjects', score: textObjectsResult.length });
  }
  
  // Method 2: Streams
  const streamsResult = extractTextFromStreams(pdfBytes);
  if (streamsResult && streamsResult.length > 100) {
    results.push({ text: streamsResult, method: 'streams', score: streamsResult.length });
  }
  
  // Method 3: Parentheses
  const parenthesesResult = extractTextFromParentheses(pdfBytes);
  if (parenthesesResult && parenthesesResult.length > 100) {
    results.push({ text: parenthesesResult, method: 'parentheses', score: parenthesesResult.length });
  }
  
  // Method 4: Various encodings
  const encodingsResult = extractTextWithEncodings(pdfBytes);
  if (encodingsResult && encodingsResult.length > 100) {
    // Give encodings a slight boost as they're often better for international text
    results.push({ text: encodingsResult, method: 'encodings', score: encodingsResult.length * 1.2 });
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
  return "";
}
