
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required and must be a string');
    }

    // Test API key by listing available models
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return new Response(JSON.stringify({
        valid: false,
        error: data.error?.message || `API Error: ${response.status} ${response.statusText}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Extract models from response
    const models = data.models || [];
    
    return new Response(JSON.stringify({
      valid: true,
      models: models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        capabilities: model.capabilities || []
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Error in verify-anthropic-key function:", error);
    
    return new Response(JSON.stringify({
      valid: false,
      error: error.message || 'An unexpected error occurred when verifying the API key'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
