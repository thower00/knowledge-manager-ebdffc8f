
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { 
  isPdfData,
  extractPdfMetadata,
  extractTextWithTimeout,
  cleanAndNormalizeText,
  extractTextByLines,
  extractTextPatterns
} from "./text-extraction.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey,X-Check-Availability",
};

// Main function to extract text from PDF
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
    
    // Check if this looks like a PDF
    if (!isPdfData(pdfBytes)) {
      console.warn("The data does not appear to be a PDF");
    }
    
    // Extract metadata
    const metadata = extractPdfMetadata(pdfBytes);
    const pageCount = metadata.pageCount;
    
    // Extract text with timeout protection
    let extractedText;
    try {
      // Use a reasonable timeout to prevent function timeouts
      extractedText = await extractTextWithTimeout(pdfBytes, 25000);
      
      if (!extractedText || extractedText.length < 50) {
        console.log("Couldn't extract meaningful text using standard methods, trying alternatives");
        
        // Try alternative extraction methods
        const textByLines = extractTextByLines(pdfBytes);
        if (textByLines && textByLines.length > 100) {
          console.log(`Got better results using line-based extraction: ${textByLines.length} chars`);
          extractedText = textByLines;
        } else {
          // Try pattern-based extraction as last resort
          const patternText = extractTextPatterns(pdfBytes);
          if (patternText && patternText.length > 100) {
            console.log(`Using pattern extraction as fallback: ${patternText.length} chars`);
            extractedText = patternText;
          } else {
            return {
              text: "The document appears to be a PDF, but the text could not be extracted. The PDF might be scan-based or have security restrictions.",
              success: false,
              error: "Text extraction failed",
              totalPages: pageCount,
              processedPages: 0
            };
          }
        }
      }
      
      console.log(`Raw text extracted, length: ${extractedText.length} characters`);
      
      // Apply ultra-aggressive text cleaning - this is the key improvement
      console.log("Applying advanced multi-stage text cleaning");
      
      // First pass - remove clearly binary/non-text content
      let cleanedText = extractedText
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')   // Control characters
        .replace(/[^\x20-\x7E\r\n\t\u00A0-\u00FF\u2000-\u206F]/g, ' ')  // Keep printable ASCII, Latin-1 and punctuation
        .replace(/\uFFFD/g, ' ');                                  // Replace Unicode replacement char
        
      // Second pass - extract meaningful words
      const words = cleanedText.split(/\s+/)
        .filter(word => {
          // Look for words with 3+ consecutive letters (likely real text)
          return word.length >= 3 && /[a-zA-Z]{3,}/.test(word);
        })
        .join(' ');
      
      if (words.length > 300) {
        console.log(`Extracted ${words.length} chars of meaningful text after cleaning`);
        cleanedText = words;
      } else {
        console.log("Text quality still poor after cleaning, trying deeper extraction");
        
        // Look for chunks of meaningful text
        const textChunks = extractedText.match(/[A-Za-z .,;:!?]{20,}/g);
        if (textChunks && textChunks.length > 0) {
          const betterText = textChunks.join('\n\n');
          if (betterText.length > 200) {
            console.log(`Found ${textChunks.length} meaningful text chunks, total ${betterText.length} chars`);
            cleanedText = betterText;
          }
        }
      }
      
      // If still no good text, extract sequences of letters as fallback
      if (cleanedText.length < 200) {
        console.log("Using letter sequence extraction as last resort");
        const letterSequences = extractedText.match(/[A-Za-z]{3,}[A-Za-z\s.,;:!?]{5,}/g);
        if (letterSequences && letterSequences.length > 5) {
          cleanedText = letterSequences.join(' ');
        }
      }
      
      // Final normalization
      cleanedText = cleanedText
        .replace(/\s+/g, ' ')
        .trim();
        
      console.log(`Final cleaned text: ${cleanedText.length} characters`);
      extractedText = cleanedText;
    } catch (error) {
      console.error("Text extraction error:", error);
      return {
        text: `Error extracting text: ${error.message || "Unknown error"}`,
        success: false,
        error: error.message,
        totalPages: pageCount,
        processedPages: 0
      };
    }
    
    // Determine how many pages to process based on options
    const maxPages = options?.maxPages ? Math.min(options.maxPages, pageCount) : pageCount;
    
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
      pages: [],
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
      timeout: options.timeout || 60,
      forceTextMode: options.forceTextMode || false,
      disableBinaryOutput: options.disableBinaryOutput || false,
      strictTextCleaning: options.strictTextCleaning || false
    }));

    // Process the PDF with a timeout to prevent function timeouts
    const processingPromise = extractTextFromPdf(pdfBase64, options);
    
    // Set a timeout that's shorter than the Supabase edge function limit (usually 60s)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("PDF processing timed out at the endpoint level"));
      }, 45000); // 45 second timeout
    });
    
    // Race the processing against the timeout
    const result = await Promise.race([processingPromise, timeoutPromise])
      .catch(error => {
        console.error("PDF processing error:", error);
        return { 
          error: error.message || "PDF processing timed out",
          success: false 
        };
      });
    
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
