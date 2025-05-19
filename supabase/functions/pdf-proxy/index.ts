
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return cors();
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`Proxying request for: ${url}`);
    
    // Extract file ID if it's a Google Drive URL
    let fileId = null;
    let directUrl = url;
    
    if (url.includes('drive.google.com/file/d/')) {
      fileId = url.match(/\/d\/([^/]+)/)?.[1];
      if (fileId) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        console.log(`Converted to direct download URL: ${directUrl}`);
      }
    }
    
    // Set a reasonable timeout for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      // Fetch the document with timeout
      const response = await fetch(directUrl, {
        headers: {
          // Use common browser headers
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': '*/*',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear the timeout if fetch completes
      
      if (!response.ok) {
        console.error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        return new Response(
          JSON.stringify({ 
            error: `Failed to fetch file: ${response.status} ${response.statusText}` 
          }),
          {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Get content type from response
      const contentType = response.headers.get('content-type');
      
      // Get the file data as an array buffer
      const fileData = await response.arrayBuffer();
      
      // Return the binary data with appropriate headers
      return new Response(fileData, {
        headers: {
          "Content-Type": contentType || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "max-age=3600",
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId); // Clear the timeout on error
      
      if (fetchError.name === 'AbortError') {
        console.error('Fetch operation timed out');
        throw new Error('Request timed out. The document may be too large or the server is not responding.');
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    console.error(`PDF proxy error: ${error.message}`);
    
    // Provide a more helpful error message based on the error
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes('timed out') || error.message.includes('timeout')) {
      errorMessage = 'Request timed out. The document may be too large or the server is not responding.';
    } else if (error.message.includes('NetworkError') || error.message.includes('network')) {
      errorMessage = 'Network error: Unable to connect to the document server. Please check that the URL is accessible.';
      statusCode = 503;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        originalError: error.message
      }),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
