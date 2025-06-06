
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey,Cache-Control,Pragma",
  "Access-Control-Max-Age": "86400",
};

// Helper function to convert Google Drive URLs to direct download format if needed
function optimizeGoogleDriveUrl(url: string): string {
  if (!url.includes('drive.google.com')) {
    return url;
  }

  // Already in proper format with alt=media
  if (url.includes('alt=media')) {
    return url;
  }
  
  // Already in proper format
  if (url.includes('uc?export=download')) {
    // Add alt=media if needed
    return url + (url.includes('?') ? '&' : '?') + 'alt=media';
  }

  // Convert from /file/d/ID/view to proper format
  const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    console.log(`Converting Google Drive URL with file ID: ${fileId}`);
    // Using export=download and alt=media for reliable direct access
    return `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`;
  }
  
  // Try to extract any ID-looking string
  const anyIdMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
  if (anyIdMatch && anyIdMatch[1]) {
    console.log(`Extracted potential Google Drive ID by pattern match: ${anyIdMatch[1]}`);
    return `https://drive.google.com/uc?export=download&id=${anyIdMatch[1]}&alt=media`;
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
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
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
      nonce: requestBody.nonce || null,
      noCache: requestBody.noCache || false
    }));
    
    // Handle connection test requests - Always respond with success for test requests
    if (requestBody.action === "connection_test") {
      return handleConnectionTest(requestBody);
    }
    
    const { url, title } = requestBody;
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing URL parameter" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json", 
            "Cache-Control": "no-store, no-cache",
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Optimize Google Drive URLs for direct access
    const optimizedUrl = optimizeGoogleDriveUrl(url);
    
    console.log(`Proxying request for ${title || "document"}`);
    console.log(`Original URL: ${url}`);
    console.log(`Optimized URL: ${optimizedUrl}`);
    
    // Fetch the document with proper headers for Google Drive
    const headers = new Headers({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
    
    // Add cache-busting if requested
    if (requestBody.noCache) {
      headers.append("Cache-Control", "no-cache, no-store");
      headers.append("Pragma", "no-cache");
    }
    
    // Enhanced error handling for fetch
    let response;
    try {
      response = await fetch(optimizedUrl, {
        headers,
        // Add reasonable timeout
        signal: AbortSignal.timeout(25000) // 25 second timeout
      });
    } catch (fetchError) {
      console.error("Fetch operation failed:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch document: ${fetchError.message || "Network error"}`,
          details: {
            url: optimizedUrl,
            originalUrl: url !== optimizedUrl ? url : undefined,
            wasOptimized: url !== optimizedUrl
          }
        }),
        { 
          status: 502, 
          headers: { 
            "Content-Type": "application/json", 
            "Cache-Control": "no-store, no-cache",
            ...corsHeaders 
          } 
        }
      );
    }
    
    if (!response.ok) {
      console.error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      
      // Special handling for Google Drive errors
      if (optimizedUrl.includes('drive.google.com') && response.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: "Access denied. Make sure the Google Drive document is shared with 'Anyone with the link'." 
          }),
          { 
            status: 403, 
            headers: { 
              "Content-Type": "application/json", 
              "Cache-Control": "no-store, no-cache",
              ...corsHeaders 
            } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Failed to fetch document: ${response.status} ${response.statusText}` }),
        { 
          status: response.status, 
          headers: { 
            "Content-Type": "application/json", 
            "Cache-Control": "no-store, no-cache",
            ...corsHeaders 
          } 
        }
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
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
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
          "Cache-Control": "no-store, no-cache",
          ...corsHeaders 
        } 
      }
    );
  }
});
