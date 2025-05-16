
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { cors } from "../_shared/cors.ts";

// Edge function to list files from Google Drive
serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return cors();
  }
  
  try {
    const { client_email, private_key, folder_id } = await req.json();
    
    // Validate required parameters
    if (!client_email || !private_key) {
      console.error("Missing required Google Drive credentials");
      return new Response(
        JSON.stringify({ error: "Missing required Google Drive credentials" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors().headers } }
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
        { status: 200, headers: { "Content-Type": "application/json", ...cors().headers } }
      );
    } catch (tokenError) {
      console.error("Error with Google authentication:", tokenError);
      return new Response(
        JSON.stringify({ error: `Google authentication failed: ${tokenError.message}` }),
        { status: 401, headers: { "Content-Type": "application/json", ...cors().headers } }
      );
    }
  } catch (error) {
    console.error("Error in list-google-drive-files:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to list Google Drive files" }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors().headers } }
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
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
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
    const keyData = encoder.encode(privateKey);
    
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyData,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      cryptoKey,
      encoder.encode(signatureInput)
    );
    
    // Convert signature to base64
    const signatureBytes = new Uint8Array(signature);
    let signatureBase64 = "";
    for (let i = 0; i < signatureBytes.length; i++) {
      signatureBase64 += String.fromCharCode(signatureBytes[i]);
    }
    const signatureEncoded = btoa(signatureBase64);
    
    // Return JWT
    return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
  } catch (error) {
    console.error("Error creating JWT:", error);
    throw new Error(`JWT creation failed: ${error.message}`);
  }
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
      const errorData = await response.json();
      console.error("Google Drive API error response:", errorData);
      throw new Error(`Google Drive API error: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error listing Google Drive files:", error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}
