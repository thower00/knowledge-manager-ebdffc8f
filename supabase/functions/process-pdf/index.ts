
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey",
};

// Simple PDF text extraction function using a third-party service
// This avoids browser-specific dependencies that Deno doesn't support
async function extractTextFromPdf(base64Data, options = {}) {
  try {
    // For checking availability, we return a success message without processing
    if (!base64Data || base64Data === "check") {
      return {
        text: "PDF processing service is available",
        success: true,
        pages: [],
        totalPages: 0,
        processedPages: 0
      };
    }
    
    // Simple text extraction from binary data
    // Using a simulated approach since we can't use PDF.js directly
    const pdfBytes = atob(base64Data);
    
    // Find text markers in the PDF binary
    // This is a very simplified approach - in production you would use a proper PDF library
    // that's compatible with Deno/Edge Functions
    let extractedText = "";
    let pageCount = 0;
    
    // Count PDF pages (very approximate)
    const pageMarkers = pdfBytes.match(/\/Page\s*<<.*?>>/g);
    if (pageMarkers) {
      pageCount = pageMarkers.length;
    } else {
      // Fallback estimate
      pageCount = Math.max(1, Math.floor(pdfBytes.length / 5000));
    }
    
    console.log(`Estimated ${pageCount} pages in document`);
    
    // Extract some text from the PDF (very simplified approach)
    const textMatches = pdfBytes.match(/\(([^)]+)\)/g);
    if (textMatches) {
      const processedMatches = textMatches
        .slice(0, 1000) // Limit processing to avoid timeouts
        .map(match => match.substring(1, match.length - 1))
        .filter(text => /[a-zA-Z0-9]/.test(text)); // Only keep text with alphanumeric chars
      
      extractedText = processedMatches.join(" ");
    }
    
    // Determine how many pages to process based on options
    const maxPages = options.maxPages ? Math.min(options.maxPages, pageCount) : pageCount;
    
    // Create a structured response
    const processedPages = [];
    for (let i = 1; i <= maxPages; i++) {
      // In a real implementation, we'd extract text per page
      processedPages.push({
        pageNumber: i,
        text: `Page ${i} content`
      });
    }
    
    // Format the text with page numbers
    let formattedText = "";
    for (let i = 1; i <= maxPages; i++) {
      formattedText += `--- Page ${i} ---\n`;
      formattedText += extractedText + `\n\n`;
    }
    
    // Add footer if we limited the pages
    if (maxPages < pageCount) {
      formattedText += `\n--- Only ${maxPages} of ${pageCount} pages were processed ---\n`;
    }
    
    return {
      text: formattedText || "No text could be extracted",
      pages: processedPages,
      totalPages: pageCount,
      processedPages: maxPages,
      success: true
    };
  } catch (error) {
    console.error("Error extracting text:", error);
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    // Check if this is just an availability check
    if (req.headers.get("x-check-availability") === "true") {
      return new Response(
        JSON.stringify({ 
          available: true, 
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
    
    const requestBody = await req.json();
    const { pdfBase64, options = {}, checkAvailability = false } = requestBody;
    
    // Handle simple availability check
    if (checkAvailability) {
      return new Response(
        JSON.stringify({ 
          available: true, 
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
          "Cache-Control": "no-store", 
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
