
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check proxy connection status
 */
export function useProxyConnectionCheck() {
  const [proxyConnected, setProxyConnected] = useState<boolean | null>(null);
  
  // Enhanced proxy connection check with more informative logging
  const checkProxyConnection = async () => {
    try {
      // Get the auth token
      const authSession = await supabase.auth.getSession();
      const authToken = authSession.data.session?.access_token || '';
      
      // Use the public anon key
      const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0";
      
      const response = await fetch('https://sxrinuxxlmytddymjbmr.supabase.co/functions/v1/pdf-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': apiKey
        },
        body: JSON.stringify({ 
          action: "connection_test",
          timestamp: Date.now(),
          nonce: Math.random().toString(36).substring(2, 10)
        })
      });
      
      if (!response.ok) {
        console.error("Proxy connection failed:", await response.text());
        setProxyConnected(false);
        return false;
      }
      
      const data = await response.json();
      console.log("Proxy connection test result:", data);
      
      setProxyConnected(true);
      return true;
    } catch (error) {
      console.error("Proxy connection failed:", error);
      setProxyConnected(false);
      return false;
    }
  };
  
  return {
    proxyConnected,
    setProxyConnected,
    checkProxyConnection
  };
}
