
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.133/+esm";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.133/build/pdf.worker.min.js";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    const requestBody = await req.json();
    const { pdfBase64, options = {} } = requestBody;
    
    if (!pdfBase64) {
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
    
    // Convert base64 to binary data
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Load the PDF document
    console.log("Loading PDF document...");
    const loadingTask = pdfjs.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    console.log(`PDF loaded successfully. Total pages: ${pageCount}`);
    
    // Determine how many pages to process
    const maxPages = options.maxPages ? Math.min(options.maxPages, pageCount) : pageCount;
    
    // Process pages
    let extractedText = "";
    const processedPages = [];
    
    for (let i = 1; i <= maxPages; i++) {
      console.log(`Processing page ${i} of ${maxPages}`);
      
      // Get the page
      const page = await pdf.getPage(i);
      
      // Extract the text content
      const textContent = await page.getTextContent();
      
      // Join text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      extractedText += `--- Page ${i} ---\n${pageText}\n\n`;
      
      processedPages.push({
        pageNumber: i,
        text: pageText
      });
      
      // Clean up page resources
      page.cleanup();
    }
    
    // Add footer if we limited the pages
    if (maxPages < pageCount) {
      extractedText += `\n--- Only ${maxPages} of ${pageCount} pages were processed ---\n`;
    }
    
    console.log(`PDF processing completed successfully. Processed ${maxPages} pages.`);
    
    // Return the extracted text
    return new Response(
      JSON.stringify({
        text: extractedText,
        pages: processedPages,
        totalPages: pageCount,
        processedPages: maxPages
      }),
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
