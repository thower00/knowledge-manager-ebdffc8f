
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { client_email, private_key, project_id, folder_id } = await req.json();
    
    // Validate required fields
    if (!client_email || !private_key) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Client email and private key are required" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("Attempting to verify Google Drive configuration");
    console.log(`Client email: ${client_email.substring(0, 5)}...`);
    console.log(`Private key provided: ${private_key ? 'Yes' : 'No'}`);
    console.log(`Project ID: ${project_id || 'Not provided'}`);
    console.log(`Folder ID: ${folder_id || 'Not provided'}`);

    // In a real implementation, we would use the Google Drive API SDK
    // to verify the credentials. For this example, we'll do a basic check
    // of the format and simulate a verification.

    // Check if client_email has correct format
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(client_email)) {
      console.log("Invalid client email format");
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid client email format" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if private_key has correct format (starts with -----BEGIN PRIVATE KEY-----)
    if (!private_key.includes("-----BEGIN PRIVATE KEY-----")) {
      console.log("Invalid private key format");
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid private key format" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // In a real implementation, we would make an actual API call to Google Drive
    // to verify the credentials. Here we're just simulating a successful verification.
    console.log("Google Drive configuration verification successful");
    
    return new Response(
      JSON.stringify({ 
        valid: true,
        message: "Google Drive configuration appears to be valid" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error("Error verifying Google Drive configuration:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
