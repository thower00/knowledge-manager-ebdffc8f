
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { 
  isPdfData,
  extractPdfMetadata,
  extractTextWithTimeout,
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
    
    // Extract text with focused approach
    let extractedText;
    try {
      console.log("Starting focused text extraction for actual readable content...");
      
      extractedText = await extractTextWithTimeout(pdfBytes, 30000);
      
      console.log(`Extracted text length: ${extractedText ? extractedText.length : 0} characters`);
      
      // Apply additional cleaning
      if (extractedText && extractedText.length > 20) {
        const cleanText = cleanAndNormalizeText(extractedText);
        console.log(`After cleaning: ${cleanText.length} characters`);
        extractedText = cleanText;
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
    
    // Format the extracted text
    let formattedText = "";
    
    if (extractedText && extractedText.length > 10) {
      // Format as a single page if we have actual content
      formattedText = `--- Page 1 ---\n${extractedText}\n\n`;
      
      // Add footer if we limited the pages
      if (maxPages < pageCount && pageCount > 1) {
        formattedText += `\n--- Document has ${pageCount} total pages ---\n`;
      }
    } else {
      formattedText = "No readable text could be extracted from this PDF. The document may be:\n- A scanned image (requires OCR)\n- Password protected\n- Corrupted\n- Using unsupported encoding\n- Entirely graphical content";
    }
    
    return {
      text: formattedText,
      pages: [],
      totalPages: pageCount,
      processedPages: 1,
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
    
    console.log("Received PDF processing request for focused text extraction");

    // Process the PDF with focused extraction
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
