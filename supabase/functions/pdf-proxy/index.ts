
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey",
  "Access-Control-Max-Age": "86400",
};

// Helper function to convert Google Drive URLs to direct download format if needed
function optimizeGoogleDriveUrl(url: string): string {
  if (!url.includes('drive.google.com')) {
    return url;
  }

  // Already in proper format
  if (url.includes('alt=media')) {
    return url;
  }

  // Convert from /file/d/ID/view to proper format
  const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`;
  }

  return url;
}

// Health check response for connection tests
function handleConnectionTest(reqBody: any) {
  console.log("Connection test request received");
  
  // Include any request params in response for debugging
  const responseData = {
    status: "connected",
    message: "PDF proxy service is available",
    timestamp: new Date().toISOString(),
    receivedNonce: reqBody.nonce || null
  };
  
  return new Response(
    JSON.stringify(responseData),
    { 
      status: 200, 
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      } 
    }
  );
}

// Edge function to proxy PDF requests to avoid CORS issues
serve(async (req: Request) => {
  // Track request processing time for diagnostics
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    const requestBody = await req.json();
    console.log("Request received:", JSON.stringify({
      action: requestBody.action,
      has_url: !!requestBody.url,
      title: requestBody.title || "untitled",
      timestamp: requestBody.timestamp || null,
      nonce: requestBody.nonce || null
    }));
    
    // Handle connection test requests - Always respond with success for test requests
    if (requestBody.action === "connection_test") {
      return handleConnectionTest(requestBody);
    }
    
    const { url, title } = requestBody;
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing URL parameter" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Optimize Google Drive URLs for direct access
    const optimizedUrl = optimizeGoogleDriveUrl(url);
    
    console.log(`Proxying request for ${title || "document"} at URL: ${optimizedUrl}`);
    
    // Fetch the document with proper headers for Google Drive
    const response = await fetch(optimizedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      // Add reasonable timeout
      signal: AbortSignal.timeout(20000) // 20 second timeout
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      
      // Special handling for Google Drive errors
      if (optimizedUrl.includes('drive.google.com') && response.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: "Access denied. Make sure the Google Drive document is shared with 'Anyone with the link'." 
          }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Failed to fetch document: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Check if the response is actually a PDF
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/pdf') && !contentType.includes('binary')) {
      console.warn(`Warning: Document might not be a PDF, content-type: ${contentType}`);
      // We'll continue anyway, as Google Drive sometimes returns wrong content types
    }
    
    // Get the document data as an array buffer
    const documentData = await response.arrayBuffer();
    
    if (documentData.byteLength === 0) {
      throw new Error("Received empty document data");
    }
    
    // Check first few bytes for PDF signature (%PDF-)
    const firstBytes = new Uint8Array(documentData.slice(0, 5));
    const isPdfSignature = firstBytes[0] === 0x25 && // %
                          firstBytes[1] === 0x50 && // P
                          firstBytes[2] === 0x44 && // D
                          firstBytes[3] === 0x46 && // F
                          firstBytes[4] === 0x2D;   // -
                          
    // Log PDF validation result but don't block non-PDF files as we might want TXT files too
    if (!isPdfSignature) {
      console.warn("Warning: Document doesn't start with PDF signature. It may not be a PDF.");
    }
    
    // Convert array buffer to base64 for transmission
    const base64Data = btoa(
      new Uint8Array(documentData).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    const processingTime = Date.now() - startTime;
    console.log(`Successfully processed document in ${processingTime}ms, size: ${documentData.byteLength} bytes`);
    
    return new Response(
      JSON.stringify(base64Data),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json", 
          "X-Processing-Time": processingTime.toString(),
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Error in pdf-proxy (${processingTime}ms):`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to process document",
        timestamp: new Date().toISOString(),
        processingTime 
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
