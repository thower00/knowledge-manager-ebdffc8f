
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
    
    // Fetch the document
    const response = await fetch(directUrl, {
      headers: {
        // Use common browser headers
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
      },
    });

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
    
  } catch (error) {
    console.error(`PDF proxy error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
