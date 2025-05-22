import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey,X-Check-Availability",
};

// Improved PDF text extraction function with better encoding support
async function extractTextFromPdf(base64Data: string, options = {}) {
  try {
    // For checking availability, we return a success message without processing
    if (!base64Data || base64Data === "check") {
      return {
        text: "PDF processing service is available",
        success: true,
        available: true,
        message: "Service is ready",
        pages: [],
        totalPages: 0,
        processedPages: 0
      };
    }
    
    // Decode the base64 data
    let pdfBytes;
    try {
      pdfBytes = atob(base64Data);
      console.log(`Successfully decoded base64 data, length: ${pdfBytes.length} bytes`);
    } catch (decodeError) {
      console.error("Error decoding base64 data:", decodeError);
      return {
        text: "Error decoding PDF data: " + decodeError.message,
        success: false,
        error: "Base64 decoding failed"
      };
    }
    
    // Count PDF pages (very approximate)
    const pageMarkers = pdfBytes.match(/\/Page\s*<<.*?>>/g);
    let pageCount = pageMarkers ? pageMarkers.length : Math.max(1, Math.floor(pdfBytes.length / 5000));
    console.log(`Estimated ${pageCount} pages in document`);
    
    // IMPROVED TEXT EXTRACTION WITH BETTER ENCODING HANDLING
    let extractedText = "";
    
    // Try to detect PDF version for better handling
    const pdfVersion = pdfBytes.substring(0, 10).match(/PDF-(\d+\.\d+)/);
    console.log(`PDF version detected: ${pdfVersion ? pdfVersion[1] : 'unknown'}`);
    
    // Step 1: Find text encoding declaration
    let encodingMatch = pdfBytes.match(/\/Encoding\s*\/([A-Za-z0-9-]+)/);
    let encoding = encodingMatch ? encodingMatch[1] : "StandardEncoding";
    console.log(`PDF encoding detected: ${encoding}`);
    
    // Step 2: Extract text using multiple methods for redundancy
    
    // Method 1: Look for text objects with proper encoding
    const textObjectPattern = /BT\s*(.*?)\s*ET/gs;
    const textObjects = [...pdfBytes.matchAll(textObjectPattern)];
    
    if (textObjects && textObjects.length > 0) {
      console.log(`Found ${textObjects.length} text objects`);
      
      // Process and combine text objects
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
      
      if (objectText.length > 100) {
        extractedText = objectText;
        console.log("Successfully extracted text using text objects method");
      }
    }
    
    // Method 2: Look for text streams if Method 1 didn't give good results
    if (!extractedText || extractedText.length < 100) {
      const textStreamPattern = /stream\s([\s\S]*?)\sendstream/g;
      const textStreams = [...pdfBytes.matchAll(textStreamPattern)];
      
      if (textStreams && textStreams.length > 0) {
        console.log(`Found ${textStreams.length} text streams`);
        
        // Take the longest streams as they likely contain the main text
        const sortedStreams = textStreams
          .map(match => match[1])
          .filter(stream => stream.length > 50)
          .sort((a, b) => b.length - a.length)
          .slice(0, 10); // Take top 10 longest streams
        
        if (sortedStreams.length > 0) {
          // Try to extract readable text from the streams
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
          
          if (streamText.length > extractedText.length) {
            extractedText = streamText;
            console.log("Successfully extracted text using stream method");
          }
        }
      }
    }
    
    // Method 3: Extract text from parenthetical strings
    if (!extractedText || extractedText.length < 100) {
      const textMatches = pdfBytes.match(/\(([^)]{3,})\)/g);
      if (textMatches && textMatches.length > 0) {
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
        
        if (joinedText.length > extractedText.length) {
          extractedText = joinedText;
          console.log("Successfully extracted text using parenthetical strings method");
        }
      }
    }
    
    // Method 4: Try using content decoding for binary streams
    if (!extractedText || extractedText.length < 100) {
      // Look for content streams with specific filters
      const contentStreamPattern = /\/Filter\s*\/([A-Za-z0-9]+).*?stream\s([\s\S]*?)\sendstream/g;
      const contentStreams = [...pdfBytes.matchAll(contentStreamPattern)];
      
      if (contentStreams && contentStreams.length > 0) {
        console.log(`Found ${contentStreams.length} content streams with filters`);
        
        // Process each filtered stream
        let decodedContent = "";
        for (const [_, filterType, content] of contentStreams) {
          // Simple extraction of ASCII text from binary streams
          const textParts = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                                 .replace(/\s+/g, ' ')
                                 .split(' ')
                                 .filter(word => word.length > 2 && /[a-zA-Z]{2,}/.test(word));
          
          if (textParts.length > 20) {
            decodedContent += textParts.join(' ') + "\n\n";
          }
        }
        
        if (decodedContent.length > extractedText.length) {
          extractedText = decodedContent;
          console.log("Successfully extracted text using content stream decoding");
        }
      }
    }
    
    // Method 5: Try different encodings on binary data - NEW ENHANCED APPROACH
    if (!extractedText || extractedText.length < 100) {
      try {
        console.log("Using enhanced encoding approach for complex PDFs");
        
        // Try multiple encoding approaches
        
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
              extractedText = words.join(' ');
              console.log("Successfully extracted text using UTF-16BE pattern matching");
            }
          }
        } catch (e) {
          console.error("UTF-16BE extraction failed", e);
        }
        
        // Approach 2: Latin-1 (ISO-8859-1) decoding with improved character filtering
        if (!extractedText || extractedText.length < 100) {
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
            extractedText = words.join(' ');
            console.log("Successfully extracted text using improved Latin-1 decoding");
          }
        }
        
        // Approach 3: Unicode code point extraction
        if (!extractedText || extractedText.length < 100) {
          console.log("Trying Unicode code point extraction");
          
          // Find sequences that might be unicode characters
          const unicodeMatches = pdfBytes.match(/\\u[0-9a-fA-F]{4}/g);
          if (unicodeMatches && unicodeMatches.length > 50) {
            const unicodeText = unicodeMatches
              .map(u => String.fromCharCode(parseInt(u.substring(2), 16)))
              .join('');
              
            if (unicodeText.length > 100) {
              extractedText = unicodeText;
              console.log("Successfully extracted text using Unicode code points");
            }
          }
        }
      } catch (e) {
        console.error("Error during encoding conversion:", e);
      }
    }
    
    // Method 6: Last resort - character frequency analysis
    if (!extractedText || extractedText.length < 100) {
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
        extractedText = words.join(' ');
        console.log("Successfully extracted text using character frequency analysis");
      }
    }
    
    // If we still couldn't extract meaningful text, return a helpful error
    if (!extractedText || extractedText.length < 50) {
      console.log("Couldn't extract meaningful text using standard methods");
      return {
        text: "The document appears to be a PDF, but the text could not be extracted. The PDF might be scan-based or have security restrictions.",
        success: false,
        error: "Text extraction failed",
        totalPages: pageCount,
        processedPages: 0
      };
    }
    
    // Determine how many pages to process based on options
    const maxPages = options?.maxPages ? Math.min(options.maxPages, pageCount) : pageCount;
    
    // Create a structured response
    const processedPages = [];
    for (let i = 1; i <= maxPages; i++) {
      processedPages.push({
        pageNumber: i,
        text: `Page ${i} content`
      });
    }
    
    // Split extracted text into pages (approximate)
    const textPerPage = Math.max(Math.floor(extractedText.length / maxPages), 500);
    let formattedText = "";
    
    for (let i = 1; i <= maxPages; i++) {
      const startPos = (i - 1) * textPerPage;
      const endPos = i === maxPages ? extractedText.length : i * textPerPage;
      const pageText = extractedText.substring(startPos, endPos);
      
      formattedText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    // Add footer if we limited the pages
    if (maxPages < pageCount) {
      formattedText += `\n--- Only ${maxPages} of ${pageCount} pages were processed ---\n`;
    }
    
    return {
      text: formattedText || "No text could be extracted. The PDF may be image-based or secured.",
      pages: processedPages,
      totalPages: pageCount,
      processedPages: maxPages,
      success: true,
      available: true
    };
  } catch (error) {
    console.error("Error extracting text:", error);
    return {
      text: `Error extracting text: ${error.message || "Unknown error"}`,
      success: false,
      error: error.message,
      available: true
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    // Check if this is just an availability check from request header
    if (req.headers.get("x-check-availability") === "true") {
      console.log("Availability check received via header");
      return new Response(
        JSON.stringify({ 
          available: true, 
          success: true,
          message: "PDF processing service is available" 
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body",
          details: parseError.message
        }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          } 
        }
      );
    }
    
    const { pdfBase64, options = {}, checkAvailability = false } = requestBody;
    
    // Handle simple availability check from request body
    if (checkAvailability) {
      console.log("Availability check received via request body");
      return new Response(
        JSON.stringify({ 
          available: true, 
          success: true,
          message: "PDF processing service is available",
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders,
            // Add cache control headers to prevent caching
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          } 
        }
      );
    }
    
    if (!pdfBase64 && !checkAvailability) {
      return new Response(
        JSON.stringify({ error: "No PDF data provided" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          } 
        }
      );
    }
    
    console.log("Received PDF processing request with options:", JSON.stringify({
      maxPages: options.maxPages || "all",
      streamMode: options.streamMode || false,
      timeout: options.timeout || 60
    }));

    // Process the PDF
    const result = await extractTextFromPdf(pdfBase64, options);
    
    // Return the extracted text
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache", 
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error processing PDF",
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        } 
      }
    );
  }
});
