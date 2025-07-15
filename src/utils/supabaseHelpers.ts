import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { SUPABASE_CONFIG } from '@/config/constants';

/**
 * Creates a fresh Supabase client with cache-busting headers
 * Useful for scenarios where you need to bypass caching
 */
export function createFreshSupabaseClient() {
  const timestamp = Date.now();
  
  return createClient<Database>(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
    db: { schema: 'public' },
    global: {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Timestamp': timestamp.toString()
      }
    }
  });
}

/**
 * Gets the full URL for a Supabase Edge Function
 */
export function getEdgeFunctionUrl(functionPath: string): string {
  return `${SUPABASE_CONFIG.URL}${functionPath}`;
}

/**
 * Creates standardized headers for API requests
 */
export function createApiHeaders(authToken?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_CONFIG.ANON_KEY
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}