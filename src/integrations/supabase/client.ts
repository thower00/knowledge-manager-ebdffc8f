
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://sxrinuxxlmytddymjbmr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0";

// Create a stable client instance that properly handles auth
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
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
