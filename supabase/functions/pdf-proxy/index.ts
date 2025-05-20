
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey",
  "Access-Control-Max-Age": "86400",
};

// Edge function to proxy PDF requests to avoid CORS issues
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
    const { url, title } = requestBody;
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing URL parameter" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`Proxying request for ${title || "document"} at URL: ${url}`);
    
    // Fetch the document
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch document: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Get the document data as an array buffer
    const documentData = await response.arrayBuffer();
    
    // No longer storing in database, just return the data
    // Convert array buffer to base64 for transmission
    const base64Data = btoa(
      new Uint8Array(documentData).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    return new Response(
      JSON.stringify(base64Data),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error("Error in pdf-proxy:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process document" }),
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
