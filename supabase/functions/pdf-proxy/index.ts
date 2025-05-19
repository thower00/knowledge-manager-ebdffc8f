
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return cors();
  }

  try {
    const requestData = await req.json();
    
    // Handle connection test requests (just to check if the function is reachable)
    if (requestData.action === "connection_test") {
      return new Response(
        JSON.stringify({ status: "ok", message: "Proxy service is reachable" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
          },
        }
      );
    }

    const { url, title } = requestData;
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
          },
        }
      );
    }

    console.log(`Proxying request for: ${url}`);
    if (title) {
      console.log(`Document title: ${title}`);
    }
    
    // Extract file ID if it's a Google Drive URL
    let fileId = null;
    let directUrl = url;
    
    // Handle multiple Google Drive URL formats
    if (url.includes('drive.google.com/file/d/')) {
      fileId = url.match(/\/d\/([^/]+)/)?.[1];
      if (fileId) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        console.log(`Converted Google Drive file URL to direct download URL: ${directUrl}`);
      }
    } else if (url.includes('drive.google.com/open?id=')) {
      fileId = new URL(url).searchParams.get('id');
      if (fileId) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        console.log(`Converted Google Drive open URL to direct download URL: ${directUrl}`);
      }
    } else if (url.includes('docs.google.com/document/d/')) {
      fileId = url.match(/\/d\/([^/]+)/)?.[1];
      if (fileId) {
        // For Google Docs, export as PDF
        directUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
        console.log(`Converted Google Doc URL to PDF export URL: ${directUrl}`);
      }
    }
    
    // Set a reasonable timeout for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
    
    try {
      // Fetch the document with timeout
      const response = await fetch(directUrl, {
        headers: {
          // Use common browser headers to avoid being blocked
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear the timeout if fetch completes
      
      if (!response.ok) {
        console.error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        
        // Provide more specific error messages for common HTTP status codes
        let errorMessage = `Failed to fetch file: ${response.status} ${response.statusText}`;
        
        if (response.status === 403) {
          errorMessage = "Access denied (403). The document requires permissions that the proxy cannot provide. For Google Drive links, ensure the file is shared with 'Anyone with the link'.";
        } else if (response.status === 404) {
          errorMessage = "Document not found (404). The URL may be incorrect or the document may have been deleted or moved.";
        } else if (response.status === 401) {
          errorMessage = "Authentication required (401). The document requires authentication that the proxy cannot provide.";
        } else if (response.status >= 500) {
          errorMessage = `Server error (${response.status}). The document server is experiencing issues. Please try again later.`;
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage }),
          {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "no-cache",
            },
          }
        );
      }

      // Get content type from response
      const contentType = response.headers.get('content-type');
      console.log(`Received content type: ${contentType}`);
      
      // Get the file data as an array buffer
      const fileData = await response.arrayBuffer();
      console.log(`Received file data: ${fileData.byteLength} bytes`);
      
      // Check if the content appears to be HTML error page instead of PDF
      if (contentType?.includes('text/html') || contentType?.includes('text/plain')) {
        // Convert first part of the response to text to check if it's an error message
        const textDecoder = new TextDecoder();
        const textPreview = textDecoder.decode(fileData.slice(0, 1000));
        
        if (textPreview.includes('error') || 
            textPreview.includes('Error') || 
            textPreview.includes('not found') ||
            textPreview.includes('denied')) {
          console.error("Received HTML error page instead of expected file");
          return new Response(
            JSON.stringify({ 
              error: "The server returned an HTML error page instead of the requested document",
              preview: textPreview.substring(0, 200)
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
              },
            }
          );
        }
      }
      
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
    } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      errorMessage = 'CORS error: The document server has blocked access through this proxy due to cross-origin restrictions.';
      statusCode = 403;
    } else if (error.message.includes('requires authentication') || error.message.includes('login')) {
      errorMessage = 'This document requires authentication. The proxy cannot access protected documents.';
      statusCode = 401;
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
          "Cache-Control": "no-cache",
        },
      }
    );
  }
});
