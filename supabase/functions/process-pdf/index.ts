
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey,X-Check-Availability",
};

// Simple PDF text extraction function without external dependencies
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
    
    // Convert base64 to Uint8Array
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
    
    // Convert to string for text extraction
    const pdfString = new TextDecoder('latin1').decode(pdfData);
    
    // Check if it's a valid PDF
    if (!pdfString.startsWith('%PDF-')) {
      return {
        text: "Invalid PDF format",
        success: false,
        error: "Not a valid PDF file"
      };
    }
    
    console.log("Valid PDF detected, extracting text...");
    
    // Extract text using improved regex patterns
    let extractedText = "";
    
    // Method 1: Extract from BT/ET blocks (text objects)
    const textObjectRegex = /BT\s+(.*?)\s+ET/gs;
    const textObjects = pdfString.match(textObjectRegex) || [];
    
    for (const textObj of textObjects) {
      // Extract text from parentheses and angle brackets
      const textInParens = textObj.match(/\((.*?)\)/g) || [];
      const textInAngles = textObj.match(/<(.*?)>/g) || [];
      
      for (const match of textInParens) {
        const text = match.slice(1, -1); // Remove parentheses
        if (text.length > 0 && !text.match(/^[\x00-\x1F\x7F-\xFF]+$/)) {
          extractedText += text + " ";
        }
      }
      
      for (const match of textInAngles) {
        const text = match.slice(1, -1); // Remove angle brackets
        // Convert hex to text if it looks like hex
        if (text.match(/^[0-9A-Fa-f]+$/)) {
          try {
            const hexText = text.replace(/../g, (hex) => String.fromCharCode(parseInt(hex, 16)));
            if (hexText.match(/[a-zA-Z]/)) {
              extractedText += hexText + " ";
            }
          } catch (e) {
            // Ignore conversion errors
          }
        }
      }
    }
    
    // Method 2: Extract from Tj operators
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(pdfString)) !== null) {
      const text = match[1];
      if (text && text.length > 0 && !text.match(/^[\x00-\x1F\x7F-\xFF]+$/)) {
        extractedText += text + " ";
      }
    }
    
    // Method 3: Extract from TJ arrays
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(pdfString)) !== null) {
      const arrayContent = match[1];
      const textMatches = arrayContent.match(/\((.*?)\)/g) || [];
      for (const textMatch of textMatches) {
        const text = textMatch.slice(1, -1);
        if (text && text.length > 0 && !text.match(/^[\x00-\x1F\x7F-\xFF]+$/)) {
          extractedText += text + " ";
        }
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\(/g, '(')
      .replace(/\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Extracted text length: ${extractedText.length} characters`);
    
    // Check if we actually extracted meaningful text
    if (!extractedText || extractedText.length < 10) {
      extractedText = "No readable text could be extracted from this PDF. The document may be:\n- A scanned image (requires OCR)\n- Password protected\n- Corrupted\n- Using unsupported encoding\n- Entirely graphical content";
    }
    
    return {
      text: extractedText,
      pages: [],
      totalPages: 1,
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
    
    console.log("Received PDF processing request with improved regex extraction");

    // Process the PDF with our improved extraction
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
