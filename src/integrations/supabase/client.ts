
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_CONFIG } from '@/config/constants';

// Create a stable client instance that properly handles auth
export const supabase = createClient<Database>(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Function to completely clean up auth state from localStorage and sessionStorage
export const cleanupAuthState = () => {
  console.log("Cleaning up auth state");
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log("Removing localStorage key:", key);
      localStorage.removeItem(key);
    }
  });
  
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log("Removing sessionStorage key:", key);
      sessionStorage.removeItem(key);
    }
  });
};

// Debug function to check auth state
export const debugAuthState = async () => {
  const session = await supabase.auth.getSession();
  console.log("Current auth session:", session);
  
  // Additional debugging info
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith('supabase.auth.') || key.includes('sb-')
  );
  console.log("Auth-related localStorage keys:", keys);
  
  const sessionKeys = Object.keys(sessionStorage || {}).filter(key => 
    key.startsWith('supabase.auth.') || key.includes('sb-')
  );
  console.log("Auth-related sessionStorage keys:", sessionKeys);
  
  return session;
};
