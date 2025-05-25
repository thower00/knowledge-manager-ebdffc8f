
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { 
  isPdfData,
  extractPdfMetadata,
  extractTextWithTimeout,
  cleanAndNormalizeText,
  extractTextByLineBreaks,
  extractTextPatterns,
  extractTextFromParentheses,
  textContainsBinaryIndicators
} from "./text-extraction.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey,X-Check-Availability",
};

// Helper function to check if text has enough readable words
function hasEnoughWords(text: string): boolean {
  const words = text.split(/\s+/).filter(word => 
    word.length >= 3 && /^[a-zA-Z]/.test(word)
  );
  return words.length >= 5;
}

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
      return {
        text: "The provided data is not a valid PDF document",
        success: false,
        error: "Invalid PDF format"
      };
    }
    
    // Extract metadata
    const metadata = extractPdfMetadata(pdfBytes);
    const pageCount = metadata.pageCount;
    console.log(`PDF has ${pageCount} pages`);
    
    // Extract text with timeout protection and aggressive strategies
    let extractedText;
    try {
      console.log("Starting comprehensive text extraction...");
      
      // Use the main extraction function
      extractedText = await extractTextWithTimeout(pdfBytes, 30000);
      
      if (!extractedText || extractedText.length < 50) {
        console.log("Primary extraction yielded insufficient text, trying alternative methods");
        
        // Try pattern-based extraction
        const patternText = extractTextPatterns(pdfBytes);
        if (patternText && patternText.length > 100) {
          console.log(`Pattern extraction found ${patternText.length} chars`);
          extractedText = patternText;
        } else {
          // Try line-based extraction
          const lineText = extractTextByLineBreaks(pdfBytes);
          if (lineText && lineText.length > 100) {
            console.log(`Line extraction found ${lineText.length} chars`);
            extractedText = lineText;
          } else {
            // Try parentheses extraction
            const parenText = extractTextFromParentheses(pdfBytes);
            if (parenText && parenText.length > 50) {
              console.log(`Parentheses extraction found ${parenText.length} chars`);
              extractedText = parenText;
            }
          }
        }
      }
      
      // If we still don't have good text, it might be a scan or complex PDF
      if (!extractedText || extractedText.length < 50) {
        console.log("All extraction methods failed to find substantial text");
        
        // Last resort: look for any readable sequences
        const readableSequences = pdfBytes.match(/[A-Za-z][A-Za-z\s.,;:!?\-'"]{10,}/g);
        if (readableSequences && readableSequences.length > 0) {
          const cleanSequences = readableSequences
            .filter(seq => !/^(endobj|stream|endstream|CIDFont|FontDescriptor|BaseFont|Encoding|ToUnicode|Adobe|Identity|Filter|FlateDecode|Length|Type|Subtype)$/i.test(seq.trim()))
            .map(seq => seq.trim())
            .filter(seq => seq.length > 5);
          
          if (cleanSequences.length > 0) {
            extractedText = cleanSequences.join(' ');
            console.log(`Last resort extraction found ${extractedText.length} chars from ${cleanSequences.length} sequences`);
          }
        }
      }
      
      console.log(`Final extracted text length: ${extractedText ? extractedText.length : 0} characters`);
      
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
    
    // Format the extracted text
    let formattedText = "";
    
    if (extractedText && extractedText.length > 0) {
      // Apply final cleaning
      const cleanText = cleanAndNormalizeText(extractedText);
      
      if (cleanText && cleanText.length > 20) {
        // Split into pages if we have substantial content
        if (cleanText.length > 1000) {
          const textPerPage = Math.max(Math.floor(cleanText.length / maxPages), 100);
          
          for (let i = 1; i <= maxPages; i++) {
            const startPos = (i - 1) * textPerPage;
            const endPos = i === maxPages ? cleanText.length : i * textPerPage;
            const pageText = cleanText.substring(startPos, endPos);
            
            formattedText += `--- Page ${i} ---\n${pageText}\n\n`;
          }
        } else {
          // Short text, put it all on page 1
          formattedText = `--- Page 1 ---\n${cleanText}\n\n`;
        }
        
        // Add footer if we limited the pages
        if (maxPages < pageCount) {
          formattedText += `\n--- Only ${maxPages} of ${pageCount} pages were processed ---\n`;
        }
      } else {
        formattedText = "The PDF contains very little readable text. This may be a scanned document or use complex formatting that requires OCR processing.";
      }
    } else {
      formattedText = "No readable text could be extracted from this PDF. The document may be:\n- A scanned image (requires OCR)\n- Password protected\n- Corrupted\n- Using unsupported encoding\n- Entirely graphical content";
    }
    
    return {
      text: formattedText,
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
    
    console.log("Received PDF processing request with comprehensive extraction enabled");

    // Process the PDF with improved extraction
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
