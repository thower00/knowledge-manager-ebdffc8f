
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Helper function to convert Google Drive view URLs to direct download URLs
function convertGoogleDriveUrl(url: string): string {
  if (!url.includes('drive.google.com')) {
    return url; // Not a Google Drive URL, return unchanged
  }
  
  // Check if it's already a direct download URL
  if (url.includes('alt=media')) {
    return url; // Already formatted correctly
  }
  
  console.log("Converting Google Drive URL:", url);
  
  // Extract file ID from various Google Drive URL formats
  let fileId = '';
  
  // Format: drive.google.com/file/d/FILE_ID/view
  const filePattern = /\/file\/d\/([^/]+)/;
  const fileMatch = url.match(filePattern);
  
  if (fileMatch && fileMatch[1]) {
    fileId = fileMatch[1];
    console.log("Extracted file ID:", fileId);
    return `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`;
  }
  
  // Format: drive.google.com/open?id=FILE_ID
  const openPattern = /\?id=([^&]+)/;
  const openMatch = url.match(openPattern);
  
  if (openMatch && openMatch[1]) {
    fileId = openMatch[1];
    console.log("Extracted file ID from open URL:", fileId);
    return `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`;
  }
  
  console.log("Could not extract file ID from Google Drive URL, using original URL");
  return url;
}

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
        JSON.stringify({ 
          status: "connected", 
          timestamp: new Date().toISOString(),
          message: "Connection successful"
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          } 
        }
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
    
    // Convert Google Drive URLs to direct download format
    const processedUrl = convertGoogleDriveUrl(url);
    
    // Log if URL was changed
    if (processedUrl !== url) {
      console.log(`Converted URL to direct download format: ${processedUrl}`);
    }
    
    // Log full URL for debugging
    console.log(`Full URL being processed: ${processedUrl}`);
    
    // Set timeout for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      // Fetch the document with proper headers for PDF files
      const response = await fetch(processedUrl, { 
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
        
        // Special handling for Google Drive unauthorized access
        if (url.includes('drive.google.com') && (response.status === 401 || response.status === 403)) {
          throw new Error("Google Drive access denied. Make sure the file is shared with 'Anyone with the link' access permission.");
        }
        
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }
      
      // Check content type to ensure we're getting a PDF
      const contentType = response.headers.get('content-type');
      console.log(`Response content type: ${contentType}`);
      
      if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream') && !contentType.includes('application/binary')) {
        console.error(`Unexpected content type: ${contentType}`);
        
        // Special error message for HTML responses that likely indicate Google Drive viewer
        if (contentType.includes('text/html')) {
          // Check the start of the response for Google Drive patterns
          const text = await response.text();
          console.error(`Response starts with: ${text.substring(0, 500)}`);
          
          if (text.includes('drive.google.com') || text.includes('docs.google.com')) {
            throw new Error(
              "The URL returned a Google Drive viewer page instead of the PDF file directly. " +
              "For Google Drive files, use a direct download URL format: " +
              "https://drive.google.com/uc?export=download&id=YOUR_FILE_ID&alt=media"
            );
          }
          
          throw new Error(`Server returned HTML instead of a PDF file. The URL might not be a direct link to a PDF.`);
        }
        
        throw new Error(`Server returned non-PDF content type: ${contentType}. This URL might not be a direct link to a PDF file.`);
      }
      
      // Get the document data as an ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      console.log(`Successfully fetched document, size: ${arrayBuffer.byteLength} bytes`);
      
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
        
        throw new Error("The file doesn't appear to be a valid PDF. If using Google Drive, make sure to use the direct download link (ends with /view?alt=media).");
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
      
      console.log(`Successfully encoded document as base64, length: ${base64Data.length}`);
      
      // Return the base64 encoded data as JSON
      return new Response(
        JSON.stringify(base64Data),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          },
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
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      }
    );
  }
});
