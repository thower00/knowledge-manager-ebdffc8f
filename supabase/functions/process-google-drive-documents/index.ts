
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { cors } from "../_shared/cors.ts";

// Edge function to process documents from Google Drive
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return cors();
  }
  
  try {
    console.log("Received request to process Google Drive documents");
    
    // Parse request body
    const requestBody = await req.json().catch(error => {
      console.error("Failed to parse request body:", error);
      throw new Error("Invalid request body");
    });
    
    const { client_email, private_key, documentIds } = requestBody;
    
    // Log information about the request (without sensitive data)
    console.log(`Processing request with client_email: ${client_email ? client_email.substring(0, 5) + "..." : "missing"}`);
    console.log(`Private key provided: ${private_key ? "Yes" : "No"}`);
    console.log(`Document IDs: ${documentIds ? JSON.stringify(documentIds) : "missing"}`);
    
    // Validate required parameters
    if (!client_email) {
      console.error("Missing client_email parameter");
      return new Response(
        JSON.stringify({ error: "Missing client_email parameter" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors().headers } }
      );
    }
    
    if (!private_key) {
      console.error("Missing private_key parameter");
      return new Response(
        JSON.stringify({ error: "Missing private_key parameter" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors().headers } }
      );
    }
    
    if (!documentIds || !documentIds.length) {
      console.error("No documents selected for processing");
      return new Response(
        JSON.stringify({ error: "No documents selected for processing" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors().headers } }
      );
    }
    
    // This is a placeholder for the actual implementation
    // In a real implementation, we would:
    // 1. Generate a JWT token for Google Drive API
    // 2. Download the documents
    // 3. Process them (e.g., extract text)
    // 4. Store them in the database
    
    console.log(`Started processing ${documentIds.length} documents`);
    
    // Return success response with CORS headers
    return new Response(
      JSON.stringify({ 
        status: "processing", 
        message: `Started processing ${documentIds.length} documents`,
        documentIds
      }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json", 
          ...cors().headers 
        } 
      }
    );
  } catch (error) {
    // Log the error for debugging
    console.error("Error in process-google-drive-documents:", error);
    
    // Check if this is a network-related error
    const errorMessage = error.message || "Failed to process documents";
    const isNetworkError = errorMessage.includes("NetworkError") || 
                          errorMessage.includes("Failed to fetch") ||
                          errorMessage.includes("network");
    
    const statusCode = isNetworkError ? 503 : 500; // 503 for network issues
    const responseMessage = isNetworkError 
      ? "Network error: Unable to connect to required services. Please check your internet connection and try again."
      : errorMessage;
    
    // Return error response with CORS headers
    return new Response(
      JSON.stringify({ error: responseMessage }),
      { 
        status: statusCode, 
        headers: { 
          "Content-Type": "application/json", 
          ...cors().headers 
        } 
      }
    );
  }
});
