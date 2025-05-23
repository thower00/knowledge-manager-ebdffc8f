
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { 
  isPdfData,
  extractPdfMetadata,
  extractTextWithTimeout,
  textContainsBinaryIndicators,
  cleanAndNormalizeText
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
        console.log("Couldn't extract meaningful text using standard methods");
        return {
          text: "The document appears to be a PDF, but the text could not be extracted. The PDF might be scan-based or have security restrictions.",
          success: false,
          error: "Text extraction failed",
          totalPages: pageCount,
          processedPages: 0
        };
      }
      
      console.log(`Successfully extracted ${extractedText.length} characters of text`);
      
      // Always check for binary data and clean aggressively
      console.log("Detected binary data in extracted text, applying additional cleaning");
      
      // Clean text more aggressively
      extractedText = cleanAndNormalizeText(extractedText);
        
      console.log(`After cleaning: ${extractedText.length} characters of text remain`);
      
      // Apply final aggressive cleaning to guarantee no binary data
      if (options?.disableBinaryOutput || options?.strictTextCleaning || options?.useAdvancedExtraction) {
        // Enhanced version with more aggressive cleaning for binary data
        extractedText = extractedText
          .replace(/[^\x20-\x7E\r\n\t]/g, ' ')  // Keep only ASCII printable chars and line breaks
          .replace(/\s+/g, ' ')                 // Collapse whitespace
          .trim();
          
        if (options?.useAdvancedExtraction) {
          // Extract meaningful words with multiple consecutive letters
          const meaningfulWords = extractedText.split(/\s+/)
            .filter(word => /[a-zA-Z]{3,}/.test(word))
            .join(' ');
            
          if (meaningfulWords.length > 200) {
            extractedText = meaningfulWords;
          }
        }
        
        console.log(`Final cleaning complete: ${extractedText.length} characters remain`);
      }
      
      // Additional pattern extraction for very problematic PDFs
      if (options?.useTextPatternExtraction && extractedText.length < 500) {
        // Try to extract text by looking for patterns and semantic structures
        const altText = extractAlternativePatterns(pdfBytes);
        if (altText && altText.length > extractedText.length * 1.5) {
          console.log(`Pattern extraction found better results: ${altText.length} vs ${extractedText.length} chars`);
          extractedText = altText;
        }
      }
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

// Try to extract text using alternative pattern-based approaches
function extractAlternativePatterns(pdfBytes: string): string | null {
  try {
    // Look for sequences that match typical text patterns
    const patterns = [
      // Look for sequences that start with capital letters followed by lowercase
      /([A-Z][a-z]{2,}\s+([a-z]+\s+){2,})/g,
      
      // Look for common paragraph patterns
      /([\w\s.,;:!?(){}\[\]"'-]{20,})/g,
      
      // Look for runs of ASCII text
      /([A-Za-z0-9\s.,;:!?(){}\[\]"'-]{15,})/g
    ];
    
    // Try each pattern in turn
    for (const pattern of patterns) {
      const matches = pdfBytes.match(pattern);
      if (matches && matches.length > 5) {
        // Join the matches, filter to remove duplicates
        const uniqueMatches = Array.from(new Set(matches));
        const result = uniqueMatches
          .filter(text => text.length > 15)
          .join('\n\n');
          
        if (result.length > 100) {
          return result;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error in pattern extraction:", error);
    return null;
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
      strictTextCleaning: options.strictTextCleaning || false,
      useAdvancedExtraction: options.useAdvancedExtraction || false,
      useTextPatternExtraction: options.useTextPatternExtraction || false
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
