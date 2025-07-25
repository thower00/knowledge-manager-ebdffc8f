
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
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return new Response(JSON.stringify({
        valid: false,
        error: data.error?.message || `API Error: ${response.status} ${response.statusText}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Extract models from response
    const models = data.data || [];
    
    // Filter to get embedding and chat models
    const embeddingModels = models.filter((model: any) => 
      model.id.includes('embedding') || model.id.includes('text-embedding')
    );
    
    const chatModels = models.filter((model: any) => 
      model.id.includes('gpt-') || 
      model.id.includes('text-davinci') ||
      model.id.includes('-o')
    );
    
    return new Response(JSON.stringify({
      valid: true,
      models: models.map((model: any) => ({
        id: model.id,
        name: model.id,
        type: model.id.includes('embedding') ? 'embedding' : 
              model.id.includes('gpt') || model.id.includes('o') ? 'chat' : 
              'other'
      })),
      embeddingModels: embeddingModels.map((model: any) => model.id),
      chatModels: chatModels.map((model: any) => model.id)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Error in verify-openai-key function:", error);
    
    return new Response(JSON.stringify({
      valid: false,
      error: error.message || 'An unexpected error occurred when verifying the API key'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
