
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cors } from "../_shared/cors.ts";

// Constants
const FETCH_TIMEOUT = 45000; // 45 second timeout

/**
 * Response header constants
 */
const HEADERS = {
  JSON: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  },
  BINARY: {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "max-age=3600",
  }
};

/**
 * Handle connection test requests
 */
function handleConnectionTest() {
  console.log("Connection test received and successful");
  return new Response(
    JSON.stringify({ status: "ok", message: "Proxy service is reachable" }),
    { status: 200, headers: HEADERS.JSON }
  );
}

/**
 * Validate input parameters
 * @param url URL to validate
 * @returns Response object if validation fails, null otherwise
 */
function validateInput(url: string) {
  if (!url) {
    return new Response(
      JSON.stringify({ error: "URL parameter is required" }),
      { status: 400, headers: HEADERS.JSON }
    );
  }
  return null;
}

/**
 * Convert Google Drive URLs to direct download URLs
 * @param url Original URL
 * @returns Direct download URL if applicable, otherwise original URL
 */
function getDirectDownloadUrl(url: string): string {
  let fileId = null;
  
  // Handle multiple Google Drive URL formats
  if (url.includes('drive.google.com/file/d/')) {
    fileId = url.match(/\/d\/([^/]+)/)?.[1];
    if (fileId) {
      console.log(`Converted Google Drive file URL to direct download URL`);
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  } else if (url.includes('drive.google.com/open?id=')) {
    fileId = new URL(url).searchParams.get('id');
    if (fileId) {
      console.log(`Converted Google Drive open URL to direct download URL`);
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  } else if (url.includes('docs.google.com/document/d/')) {
    fileId = url.match(/\/d\/([^/]+)/)?.[1];
    if (fileId) {
      // For Google Docs, export as PDF
      console.log(`Converted Google Doc URL to PDF export URL`);
      return `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
    }
  }
  
  return url; // Return original URL if no conversion needed
}

/**
 * Create a standardized error response
 * @param message Error message
 * @param status HTTP status code
 * @returns Response object
 */
function createErrorResponse(message: string, status: number = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: HEADERS.JSON }
  );
}

/**
 * Fetch document from URL with timeout
 * @param url URL to fetch document from
 * @returns Response object from fetch
 */
async function fetchDocument(url: string) {
  const directUrl = getDirectDownloadUrl(url);
  console.log("Attempting to fetch document from:", directUrl);
  
  // Set a reasonable timeout for the fetch operation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
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
    console.log(`Fetch response received: Status ${response.status}`);
    
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
      
      throw new Error(errorMessage);
    }
    
    return response;
  } catch (fetchError) {
    clearTimeout(timeoutId); // Clear the timeout on error
    
    console.error(`Fetch operation failed: ${fetchError.message}`);
    
    if (fetchError.name === 'AbortError') {
      throw new Error('Request timed out. The document may be too large or the server is not responding.');
    }
    
    throw fetchError;
  }
}

/**
 * Validate response content to check for HTML error pages
 * @param fileData ArrayBuffer containing the file data
 * @param contentType Content-Type header from response
 * @returns Object with validation result and error response if needed
 */
function validateResponseContent(fileData: ArrayBuffer, contentType: string | null) {
  if (contentType?.includes('text/html') || contentType?.includes('text/plain')) {
    // Convert first part of the response to text to check if it's an error message
    const textDecoder = new TextDecoder();
    const textPreview = textDecoder.decode(fileData.slice(0, 1000));
    
    if (textPreview.includes('error') || 
        textPreview.includes('Error') || 
        textPreview.includes('not found') ||
        textPreview.includes('denied')) {
      console.error("Received HTML error page instead of expected file");
      return {
        isValid: false,
        errorResponse: new Response(
          JSON.stringify({ 
            error: "The server returned an HTML error page instead of the requested document",
            preview: textPreview.substring(0, 200)
          }),
          { status: 400, headers: HEADERS.JSON }
        )
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Process PDF request and return the file
 * @param requestData Request data containing URL and title
 * @returns Response object with PDF data or error
 */
async function processPdfRequest(requestData: any) {
  const { url, title } = requestData;
  
  const validationError = validateInput(url);
  if (validationError) return validationError;
  
  console.log(`Proxying request for: ${url}`);
  if (title) {
    console.log(`Document title: ${title}`);
  }
  
  try {
    const response = await fetchDocument(url);
    
    // Get content type from response
    const contentType = response.headers.get('content-type');
    console.log(`Received content type: ${contentType}`);
    
    // Get the file data as an array buffer
    const fileData = await response.arrayBuffer();
    console.log(`Received file data: ${fileData.byteLength} bytes`);
    
    // Check if the content appears to be HTML error page instead of PDF
    const contentValidation = validateResponseContent(fileData, contentType);
    if (!contentValidation.isValid) {
      return contentValidation.errorResponse;
    }
    
    console.log("Successfully fetched document, returning binary data");
    
    // Return the binary data with appropriate headers
    return new Response(fileData, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        ...HEADERS.BINARY,
      },
    });
  } catch (error) {
    return createErrorResponse(error.message);
  }
}

/**
 * Handle request errors with specific error messages
 * @param error Error object
 * @returns Response object with error details
 */
function handleRequestError(error: Error) {
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
  
  return createErrorResponse(errorMessage, statusCode);
}

/**
 * Main request handler
 */
serve(async (req) => {
  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return cors();
  }

  try {
    const requestData = await req.json();
    
    // Handle connection test requests
    if (requestData.action === "connection_test") {
      return handleConnectionTest();
    }
    
    // Process PDF requests
    return await processPdfRequest(requestData);
    
  } catch (error) {
    return handleRequestError(error);
  }
});
