
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
    const { apiKey } = await req.json();
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: "API key is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("Attempting to verify HuggingFace API key");
    
    // Make a request to HuggingFace API to verify the key
    const response = await fetch('https://api-inference.huggingface.co/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      // If we get a successful response, the key is valid
      const models = await response.json();
      console.log("HuggingFace API key verification successful");
      return new Response(
        JSON.stringify({ 
          valid: true, 
          models: models.slice(0, 5).map((model: any) => model.id || model.modelId || model.model_id) 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // HuggingFace returns different error formats
      let error = "Invalid API key";
      try {
        const errorData = await response.json();
        error = errorData.error || errorData.message || "Invalid API key";
      } catch (e) {
        // If we can't parse the error, use the response status
        error = `HTTP Error: ${response.status}`;
      }
      
      console.log("HuggingFace API key verification failed:", error);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: error 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error("Error verifying HuggingFace API key:", error);
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
