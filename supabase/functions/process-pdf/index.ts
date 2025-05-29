
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Import PDF.js for proper PDF parsing
import { getDocument, GlobalWorkerOptions } from "https://cdn.skypack.dev/pdfjs-dist@3.11.174";

// Set up PDF.js worker (required for proper functioning)
GlobalWorkerOptions.workerSrc = "https://cdn.skypack.dev/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey,X-Check-Availability",
};

// Main function to extract text from PDF using PDF.js
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
    
    // Convert base64 to Uint8Array for PDF.js
    let pdfData;
    try {
      const binaryString = atob(base64Data);
      pdfData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pdfData[i] = binaryString.charCodeAt(i);
      }
      console.log(`Successfully decoded base64 data, length: ${pdfData.length} bytes`);
    } catch (decodeError) {
      console.error("Error decoding base64 data:", decodeError);
      return {
        text: "Error decoding PDF data: " + decodeError.message,
        success: false,
        error: "Base64 decoding failed"
      };
    }
    
    // Load PDF document using PDF.js
    let pdfDocument;
    try {
      pdfDocument = await getDocument({ data: pdfData }).promise;
      console.log(`PDF loaded successfully, ${pdfDocument.numPages} pages`);
    } catch (pdfError) {
      console.error("Error loading PDF:", pdfError);
      return {
        text: "Error loading PDF: " + pdfError.message,
        success: false,
        error: "PDF loading failed"
      };
    }
    
    const totalPages = pdfDocument.numPages;
    const maxPages = options?.maxPages ? Math.min(options.maxPages, totalPages) : totalPages;
    
    // Extract text from each page
    const textParts = [];
    let processedPages = 0;
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${maxPages}`);
        
        // Get the page
        const page = await pdfDocument.getPage(pageNum);
        
        // Extract text content
        const textContent = await page.getTextContent();
        
        // Combine text items into readable text
        const pageText = textContent.items
          .filter(item => item.str && item.str.trim().length > 0)
          .map(item => item.str)
          .join(' ')
          .trim();
        
        if (pageText.length > 0) {
          textParts.push(`--- Page ${pageNum} ---\n${pageText}\n`);
          console.log(`Extracted ${pageText.length} characters from page ${pageNum}`);
        } else {
          console.log(`No text found on page ${pageNum}`);
        }
        
        processedPages++;
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        textParts.push(`--- Page ${pageNum} ---\nError extracting text from this page: ${pageError.message}\n`);
      }
    }
    
    // Combine all text
    let extractedText = textParts.join('\n');
    
    // Add footer if we limited the pages
    if (maxPages < totalPages) {
      extractedText += `\n--- Document has ${totalPages} total pages, showing first ${maxPages} ---\n`;
    }
    
    // Check if we actually extracted meaningful text
    if (!extractedText || extractedText.length < 50) {
      extractedText = "No readable text could be extracted from this PDF. The document may be:\n- A scanned image (requires OCR)\n- Password protected\n- Corrupted\n- Using unsupported encoding\n- Entirely graphical content";
    }
    
    console.log(`Total extracted text length: ${extractedText.length} characters`);
    
    return {
      text: extractedText,
      pages: [],
      totalPages: totalPages,
      processedPages: processedPages,
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
    
    console.log("Received PDF processing request with PDF.js extraction");

    // Process the PDF with PDF.js
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
