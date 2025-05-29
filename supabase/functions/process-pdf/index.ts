import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey,X-Check-Availability",
};

// Enhanced PDF text extraction with multiple strategies and better debugging
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
    
    console.log("Valid PDF detected, starting enhanced text extraction...");
    
    // Initialize extracted text
    let extractedText = "";
    let debugInfo = [];
    
    // Strategy 1: Look for stream objects and decode them
    console.log("Strategy 1: Looking for stream objects...");
    const streamRegex = /stream\s*(.*?)\s*endstream/gs;
    const streams = pdfString.match(streamRegex) || [];
    console.log(`Found ${streams.length} stream objects`);
    
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i];
      // Remove 'stream' and 'endstream' markers
      const streamContent = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
      
      // Look for text in the stream
      const textInStream = extractTextFromStream(streamContent);
      if (textInStream) {
        extractedText += textInStream + " ";
        debugInfo.push(`Stream ${i + 1}: Found ${textInStream.length} characters`);
      }
    }
    
    // Strategy 2: Enhanced BT/ET block extraction
    console.log("Strategy 2: Enhanced BT/ET block extraction...");
    const textObjectRegex = /BT\s+(.*?)\s+ET/gs;
    const textObjects = pdfString.match(textObjectRegex) || [];
    console.log(`Found ${textObjects.length} BT/ET text objects`);
    
    for (let i = 0; i < textObjects.length; i++) {
      const textObj = textObjects[i];
      const textFromObj = extractTextFromBTET(textObj);
      if (textFromObj) {
        extractedText += textFromObj + " ";
        debugInfo.push(`BT/ET ${i + 1}: Found ${textFromObj.length} characters`);
      }
    }
    
    // Strategy 3: Look for Tj and TJ operators with enhanced patterns
    console.log("Strategy 3: Enhanced Tj/TJ operator extraction...");
    
    // Tj operators
    const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    let match;
    let tjCount = 0;
    while ((match = tjRegex.exec(pdfString)) !== null) {
      const text = decodeTextContent(match[1]);
      if (text && text.length > 0) {
        extractedText += text + " ";
        tjCount++;
      }
    }
    console.log(`Found ${tjCount} Tj operators with text`);
    
    // TJ arrays
    const tjArrayRegex = /\[((?:[^\[\]\\]|\\.)*)\]\s*TJ/g;
    let tjArrayCount = 0;
    while ((match = tjArrayRegex.exec(pdfString)) !== null) {
      const arrayContent = match[1];
      const textMatches = arrayContent.match(/\(((?:[^()\\]|\\.)*)\)/g) || [];
      for (const textMatch of textMatches) {
        const text = decodeTextContent(textMatch.slice(1, -1)); // Remove parentheses
        if (text && text.length > 0) {
          extractedText += text + " ";
          tjArrayCount++;
        }
      }
    }
    console.log(`Found ${tjArrayCount} TJ array elements with text`);
    
    // Strategy 4: Look for hex-encoded text
    console.log("Strategy 4: Hex-encoded text extraction...");
    const hexTextRegex = /<([0-9A-Fa-f]+)>\s*(?:Tj|TJ)/g;
    let hexCount = 0;
    while ((match = hexTextRegex.exec(pdfString)) !== null) {
      const hexText = match[1];
      try {
        const decodedHex = hexText.replace(/../g, (hex) => String.fromCharCode(parseInt(hex, 16)));
        if (decodedHex.match(/[a-zA-Z]/)) {
          extractedText += decodedHex + " ";
          hexCount++;
        }
      } catch (e) {
        // Ignore conversion errors
      }
    }
    console.log(`Found ${hexCount} hex-encoded text elements`);
    
    // Strategy 5: Direct search for readable text patterns
    console.log("Strategy 5: Direct readable text pattern search...");
    const readableTextRegex = /([A-Za-z]{3,}(?:\s+[A-Za-z]{3,}){2,})/g;
    const readableMatches = pdfString.match(readableTextRegex) || [];
    for (const readable of readableMatches) {
      if (readable.length > 10 && !extractedText.includes(readable)) {
        extractedText += readable + " ";
      }
    }
    console.log(`Found ${readableMatches.length} readable text patterns`);
    
    // Clean up the extracted text
    extractedText = cleanExtractedText(extractedText);
    
    console.log(`Final extracted text length: ${extractedText.length} characters`);
    console.log(`Extraction strategies used: ${debugInfo.join(', ')}`);
    
    // Check if we actually extracted meaningful text
    if (!extractedText || extractedText.length < 10) {
      // Try one more desperate attempt - look for any sequences of letters
      console.log("Desperate attempt: Looking for any letter sequences...");
      const letterSequences = pdfString.match(/[A-Za-z]{3,}/g) || [];
      if (letterSequences.length > 0) {
        extractedText = letterSequences.slice(0, 50).join(' '); // Take first 50 sequences
        console.log(`Desperate attempt found ${letterSequences.length} letter sequences`);
      }
    }
    
    if (!extractedText || extractedText.length < 10) {
      extractedText = "No readable text could be extracted from this PDF. The document may be:\n- A scanned image (requires OCR)\n- Password protected\n- Corrupted\n- Using unsupported encoding\n- Entirely graphical content";
    }
    
    return {
      text: extractedText,
      pages: [],
      totalPages: 1,
      processedPages: 1,
      success: true,
      available: true,
      debugInfo: debugInfo
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

// Helper function to extract text from stream content
function extractTextFromStream(streamContent: string): string {
  let text = "";
  
  // Look for text operators in the stream
  const operators = ['Tj', 'TJ', "'", '"'];
  
  for (const op of operators) {
    const regex = new RegExp(`\\(((?:[^()\\\\]|\\\\.)*?)\\)\\s*${op}`, 'g');
    let match;
    while ((match = regex.exec(streamContent)) !== null) {
      const decodedText = decodeTextContent(match[1]);
      if (decodedText) {
        text += decodedText + " ";
      }
    }
  }
  
  return text.trim();
}

// Helper function to extract text from BT/ET blocks
function extractTextFromBTET(textObj: string): string {
  let text = "";
  
  // Extract text from parentheses
  const textInParens = textObj.match(/\(((?:[^()\\]|\\.)*)\)/g) || [];
  for (const match of textInParens) {
    const content = match.slice(1, -1); // Remove parentheses
    const decodedText = decodeTextContent(content);
    if (decodedText) {
      text += decodedText + " ";
    }
  }
  
  // Extract text from angle brackets (hex)
  const textInAngles = textObj.match(/<([0-9A-Fa-f]+)>/g) || [];
  for (const match of textInAngles) {
    const hexContent = match.slice(1, -1); // Remove angle brackets
    try {
      const decodedHex = hexContent.replace(/../g, (hex) => String.fromCharCode(parseInt(hex, 16)));
      if (decodedHex.match(/[a-zA-Z]/)) {
        text += decodedHex + " ";
      }
    } catch (e) {
      // Ignore conversion errors
    }
  }
  
  return text.trim();
}

// Helper function to decode text content
function decodeTextContent(content: string): string {
  if (!content) return "";
  
  try {
    // Handle escaped characters
    let decoded = content
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    
    // Filter out non-printable characters but keep spaces and common punctuation
    decoded = decoded.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ');
    
    // Only return if it contains actual letters
    if (decoded.match(/[a-zA-Z]/)) {
      return decoded;
    }
  } catch (e) {
    // Ignore decode errors
  }
  
  return "";
}

// Helper function to clean extracted text
function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/\s*\n\s*/g, '\n')  // Clean line breaks
    .trim();
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
    
    console.log("Received PDF processing request with enhanced multi-strategy extraction");

    // Process the PDF with our enhanced extraction
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
