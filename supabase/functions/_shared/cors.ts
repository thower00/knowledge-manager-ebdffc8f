
// CORS headers helper for all edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

// Helper function to handle OPTIONS requests
export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
