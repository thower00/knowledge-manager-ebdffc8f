
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse request body
    const requestData = await req.json();
    
    // Handle connection test request
    if (requestData.action === "connection_test") {
      console.log("Connection test received");
      return new Response(
        JSON.stringify({ status: "connected", timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { url, title, documentId, storeInDatabase } = requestData;
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Fetching document: ${title || url}`);
    console.log(`Store in database: ${storeInDatabase ? 'yes' : 'no'}`);
    console.log(`Document ID: ${documentId || 'not provided'}`);
    
    // Log full URL for debugging
    console.log(`Full URL being processed: ${url}`);
    
    // Set timeout for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      // Fetch the document with proper headers for PDF files
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          // Add common headers that might help with certain sources
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/pdf,*/*',
          // Try to force download rather than view in browser
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        redirect: 'follow' // Follow redirects automatically
      });
      
      // Clear the timeout since the fetch completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`Fetch failed with status: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }
      
      // Check content type to ensure we're getting a PDF
      const contentType = response.headers.get('content-type');
      console.log(`Response content type: ${contentType}`);
      
      if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream') && !contentType.includes('application/binary')) {
        console.error(`Unexpected content type: ${contentType}`);
        // Log the first part of the response for debugging
        const text = await response.text();
        console.error(`Response starts with: ${text.substring(0, 500)}`);
        throw new Error(`Server returned non-PDF content type: ${contentType}. This URL might not be a direct link to a PDF file.`);
      }
      
      // Get the document data as an ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Simple validation to check if this looks like a PDF
      const firstBytes = new Uint8Array(arrayBuffer.slice(0, 5));
      const isPdfSignature = firstBytes[0] === 0x25 && // %
                             firstBytes[1] === 0x50 && // P
                             firstBytes[2] === 0x44 && // D
                             firstBytes[3] === 0x46 && // F
                             firstBytes[4] === 0x2D;   // -
      
      if (!isPdfSignature) {
        // If not a PDF, log the first part of the response for debugging
        const textDecoder = new TextDecoder();
        const contentStart = textDecoder.decode(arrayBuffer.slice(0, 500));
        console.error("Response is not a valid PDF. Content starts with:", contentStart);
        
        throw new Error("The URL doesn't point to a valid PDF file. If using Google Drive, make sure to use the direct download link (ends with /view?alt=media).");
      }
      
      // Store the document in the database if requested and we have a document ID
      if (storeInDatabase && documentId) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
          
          if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing Supabase configuration for database storage");
            throw new Error("Server configuration error: Missing Supabase credentials");
          }
          
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Convert ArrayBuffer to base64 for database storage
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64Data = btoa(binary);
          
          console.log(`Storing document binary for ID: ${documentId}`);
          console.log(`Binary data size: ${base64Data.length} characters`);
          
          // Store in document_binaries table with proper error handling
          const { data, error } = await supabase
            .from('document_binaries')
            .upsert({
              document_id: documentId,
              binary_data: base64Data,
              content_type: response.headers.get('content-type') || 'application/pdf',
              file_size: arrayBuffer.byteLength
            })
            .select();
          
          if (error) {
            console.error("Error storing document binary:", error);
            throw new Error(`Database error: ${error.message}`);
          } else {
            console.log(`Successfully stored document binary for ID: ${documentId}`);
          }
        } catch (dbError) {
          console.error("Error storing document in database:", dbError);
          throw new Error(`Database operation failed: ${dbError.message || "Unknown database error"}`);
        }
      }
      
      // Convert ArrayBuffer to base64 for safe transmission
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      
      // Return the base64 encoded data as JSON
      return new Response(
        JSON.stringify(base64Data),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error("Request timed out after 30 seconds");
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in proxy service:", error.message);
    
    // Create a more detailed error response
    const errorResponse = {
      error: error.message || "Unknown error occurred",
      timestamp: new Date().toISOString(),
      details: error.stack ? error.stack.split("\n").slice(0, 3).join("\n") : "No stack trace"
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
