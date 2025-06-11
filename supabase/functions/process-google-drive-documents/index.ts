
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Client-Info,apikey",
  "Access-Control-Max-Age": "86400",
};

// Edge function to process documents from Google Drive
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
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
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!private_key) {
      console.error("Missing private_key parameter");
      return new Response(
        JSON.stringify({ error: "Missing private_key parameter" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!documentIds || !documentIds.length) {
      console.error("No documents selected for processing");
      return new Response(
        JSON.stringify({ error: "No documents selected for processing" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Create Supabase client with correct environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`Started processing ${documentIds.length} documents`);
    
    // Get metadata for documents from Google Drive API
    try {
      // Fetch document names from the list-google-drive-files function
      const { data: driveFilesResponse, error: driveError } = await supabase.functions.invoke("list-google-drive-files", {
        body: { 
          client_email: client_email,
          private_key: private_key,
          folder_id: "",
        },
      });

      if (driveError) {
        console.error("Error fetching document metadata:", driveError);
        throw new Error(`Failed to fetch document metadata: ${driveError.message}`);
      }

      if (!driveFilesResponse || !driveFilesResponse.files) {
        console.error("Invalid response from list-google-drive-files:", driveFilesResponse);
        throw new Error("Failed to get document metadata");
      }

      // Filter files to only the ones we're processing
      console.log("All files from Drive:", driveFilesResponse.files.length);
      let filesToProcess = driveFilesResponse.files.filter((file: any) => documentIds.includes(file.id));
      console.log("Files to process:", filesToProcess);

      // Verify we have matching files for all requested IDs
      if (filesToProcess.length !== documentIds.length) {
        console.warn(`Warning: Found ${filesToProcess.length} files but expected ${documentIds.length}`);
      }

      // Insert records into processed_documents table with "pending" status
      for (const docId of documentIds) {
        // Find matching file from Drive API response
        const fileData = filesToProcess.find((f: any) => f.id === docId) || { 
          name: `Document ${docId}`,
          mimeType: "application/unknown" 
        };

        const documentEntry = {
          source_id: docId,
          title: fileData.name,
          source_type: "google-drive",
          mime_type: fileData.mimeType || "application/unknown",
          status: "pending", // Changed from "processing" to "pending"
          size: fileData.size || null,
          url: fileData.webViewLink || null
        };

        console.log("Inserting document record:", documentEntry);
        
        const { data, error } = await supabase
          .from("processed_documents")
          .insert(documentEntry)
          .select();
          
        if (error) {
          console.error("Error inserting document record:", error);
          console.log("Failed to insert document:", documentEntry);
        } else {
          console.log("Successfully inserted document record:", data);
        }
      }
      
    } catch (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save documents to database" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Return success response with CORS headers
    return new Response(
      JSON.stringify({ 
        status: "pending", 
        message: `Successfully added ${documentIds.length} documents to processing queue`,
        documentIds
      }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
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
          ...corsHeaders 
        } 
      }
    );
  }
});
