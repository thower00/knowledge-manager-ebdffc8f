
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey,X-Check-Availability",
};

// Improved PDF text extraction function
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
    
    // IMPROVED TEXT EXTRACTION - Add multiple patterns for different PDF encoding types
    let extractedText = "";
    
    // Pattern 1: Look for text streams
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
        extractedText = sortedStreams.join("\n\n");
      }
    }
    
    // Pattern 2: Look for text objects in parentheses
    if (!extractedText || extractedText.length < 100) {
      const textMatches = pdfBytes.match(/\(([^)]+)\)/g);
      if (textMatches && textMatches.length > 0) {
        console.log(`Found ${textMatches.length} text matches in parentheses`);
        
        // Filter and clean text
        const processedMatches = textMatches
          .map(match => {
            try {
              // Remove the surrounding parentheses
              return match.substring(1, match.length - 1)
                // Handle basic PDF text encoding
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '')
                .replace(/\\\\/g, '\\')
                .replace(/\\t/g, '\t');
            } catch (e) {
              return '';
            }
          })
          .filter(text => /[a-zA-Z0-9]/.test(text) && text.length > 2);
        
        // Join text with spaces, but try to detect words that should be together
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
        
        extractedText = joinedText;
      }
    }
    
    // Pattern 3: Try another approach with word boundaries if previous methods didn't yield good results
    if (!extractedText || extractedText.length < 100) {
      const wordPattern = /(\w{3,})/g;
      const words = pdfBytes.match(wordPattern);
      
      if (words && words.length > 0) {
        console.log(`Found ${words.length} potential words`);
        
        // Filter for likely actual words (not binary data)
        const likelyWords = words.filter(word => 
          /^[a-zA-Z0-9]{3,}$/.test(word) && 
          !/^[0-9]+$/.test(word)
        );
        
        if (likelyWords.length > 0) {
          extractedText = likelyWords.join(" ");
        }
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
