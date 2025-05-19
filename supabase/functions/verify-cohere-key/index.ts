
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

    console.log("Attempting to verify Cohere API key");
    
    // Make a request to Cohere API to verify the key
    const response = await fetch('https://api.cohere.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json();
    
    if (response.ok) {
      console.log("Cohere API key verification successful");
      return new Response(
        JSON.stringify({ 
          valid: true, 
          models: responseData.slice(0, 5).map((model: any) => model.id || model.name) 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.log("Cohere API key verification failed:", responseData.message || responseData.error);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: responseData.message || responseData.error || "Invalid API key" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error("Error verifying Cohere API key:", error);
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
