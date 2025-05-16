
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Edge function to list files from Google Drive
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    // Parse request body with error handling
    let reqBody;
    try {
      reqBody = await req.json();
    } catch (jsonError) {
      console.error("Error parsing request JSON:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { client_email, private_key, folder_id } = reqBody;
    
    // Validate required parameters
    if (!client_email || !private_key) {
      console.error("Missing required Google Drive credentials");
      return new Response(
        JSON.stringify({ error: "Missing required Google Drive credentials" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log("Generating Google auth token");
    console.log(`Using client_email: ${client_email.substring(0, 5)}...`);
    console.log(`Private key provided: ${private_key ? "Yes" : "No"}`);
    console.log(`Folder ID: ${folder_id || "Not specified"}`);
    
    try {
      // Generate JWT token for Google Drive API
      const token = await generateGoogleAuthToken(client_email, private_key);
      console.log("Token generated successfully");
      
      // Call Google Drive API to list files
      console.log("Listing Google Drive files");
      const files = await listGoogleDriveFiles(token, folder_id);
      console.log(`Found ${files.length} files`);
      
      return new Response(
        JSON.stringify({ files }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (tokenError) {
      console.error("Error with Google authentication:", tokenError);
      return new Response(
        JSON.stringify({ error: `Google authentication failed: ${tokenError.message}` }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error("Error in list-google-drive-files:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to list Google Drive files" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Generate JWT token for Google API authentication
async function generateGoogleAuthToken(clientEmail: string, privateKey: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour expiration
  
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  };
  
  // Fix private key format if needed
  const formattedKey = privateKey.replace(/\\n/g, "\n");
  
  try {
    // Create JWT
    const jwt = await createJWT(payload, formattedKey);
    
    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${errorData}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error("No access token received from Google OAuth");
    }
    
    return tokenData.access_token;
  } catch (error) {
    console.error("Error generating Google auth token:", error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Create JWT token
async function createJWT(payload: any, privateKey: string): Promise<string> {
  try {
    // Header
    const header = { alg: "RS256", typ: "JWT" };
    
    // Encode header and payload
    const encoder = new TextEncoder();
    const headerEncoded = btoa(JSON.stringify(header));
    const payloadEncoded = btoa(JSON.stringify(payload));
    
    // Create signature
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    
    try {
      // Convert private key from PEM format to ArrayBuffer
      const privateKeyDER = pemToArrayBuffer(privateKey);
      
      // Import the private key
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyDER,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );
      
      // Sign the data
      const signature = await crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        cryptoKey,
        encoder.encode(signatureInput)
      );
      
      // Convert signature to base64
      const signatureBase64 = arrayBufferToBase64(signature);
      
      // Return JWT
      return `${headerEncoded}.${payloadEncoded}.${signatureBase64}`;
    } catch (keyError) {
      console.error("Error with key processing:", keyError);
      throw new Error(`Key processing error: ${keyError.message}`);
    }
  } catch (error) {
    console.error("Error creating JWT:", error);
    throw new Error(`JWT creation failed: ${error.message}`);
  }
}

// Helper function to convert PEM to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove header, footer and newlines
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "")
    .trim();
  
  // Decode base64 to binary string
  const binary = atob(base64);
  
  // Convert binary string to ArrayBuffer
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  
  return buffer;
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// List files from Google Drive
async function listGoogleDriveFiles(accessToken: string, folderId?: string): Promise<any[]> {
  try {
    let query = "mimeType='application/pdf' or mimeType contains 'text/' or mimeType contains 'document' or mimeType contains 'spreadsheet'";
    
    if (folderId && folderId.trim() !== "") {
      query += ` and '${folderId}' in parents`;
    }
    
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,webViewLink)`;
    
    console.log(`Calling Google Drive API with URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive API error response:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`Google Drive API error: ${JSON.stringify(errorData)}`);
      } catch (parseError) {
        throw new Error(`Google Drive API error (${response.status}): ${errorText.substring(0, 200)}`);
      }
    }
    
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error listing Google Drive files:", error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}
