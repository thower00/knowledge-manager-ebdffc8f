
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionStatus = "idle" | "checking" | "connected" | "error";

/**
 * Hook to check connection status with the proxy service
 */
export const useProxyConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");

  // Check proxy service connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionStatus("checking");
        
        // Simple connectivity check with longer timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          const { data, error } = await supabase.functions.invoke("pdf-proxy", {
            body: { action: "connection_test" },
            headers: { 'Cache-Control': 'no-cache' },
          });
          
          clearTimeout(timeoutId);
          
          if (error || controller.signal.aborted) {
            console.log("Connection test failed:", error);
            setConnectionStatus("error");
            return;
          }
          
          setConnectionStatus("connected");
        } catch (err) {
          clearTimeout(timeoutId);
          console.error("Connection test error:", err);
          setConnectionStatus("error");
        }
      } catch (err) {
        console.error("Connection test outer error:", err);
        setConnectionStatus("error");
      }
    };
    
    checkConnection();
  }, []);

  return { connectionStatus };
};
