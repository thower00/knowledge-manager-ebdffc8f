
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { url, title, documentId, storeInDatabase } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Fetching document: ${title || url}`);
    console.log(`Store in database: ${storeInDatabase ? 'yes' : 'no'}`);
    console.log(`Document ID: ${documentId || 'not provided'}`);
    
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
          'Accept': 'application/pdf,*/*'
        }
      });
      
      // Clear the timeout since the fetch completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
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
        const textContent = textDecoder.decode(arrayBuffer.slice(0, 200));
        console.error("Response is not a valid PDF. Content starts with:", textContent);
        throw new Error("Response is not a valid PDF. The URL might not point to a PDF document.");
      }
      
      // Store the document in the database if requested and we have a document ID
      if (storeInDatabase && documentId) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
          
          if (supabaseUrl && supabaseServiceKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            // Convert ArrayBuffer to Uint8Array for database storage
            const binaryData = new Uint8Array(arrayBuffer);
            
            // Store in document_binaries table
            const { error } = await supabase
              .from('document_binaries')
              .upsert({
                document_id: documentId,
                binary_data: binaryData,
                content_type: response.headers.get('content-type') || 'application/pdf',
                file_size: arrayBuffer.byteLength
              })
              .select();
            
            if (error) {
              console.error("Error storing document binary:", error);
            } else {
              console.log(`Successfully stored document binary for ID: ${documentId}`);
            }
          } else {
            console.error("Missing Supabase configuration for database storage");
          }
        } catch (dbError) {
          console.error("Error storing document in database:", dbError);
          // Don't throw, continue to return the document data
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
