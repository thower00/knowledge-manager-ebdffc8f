
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export type ConnectionStatus = "idle" | "checking" | "connected" | "error";

/**
 * Hook to check connection status with the proxy service
 */
export const useProxyConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const MAX_RETRIES = 2;
  const { toast } = useToast();

  // Check proxy service connection
  const checkConnection = useCallback(async (forceCheck = false) => {
    // Only check if we haven't checked in the last 30 seconds (to avoid excessive calls)
    // Unless forceCheck is true
    if (!forceCheck && lastChecked && (new Date().getTime() - lastChecked.getTime() < 30000)) {
      return connectionStatus;
    }
    
    try {
      setConnectionStatus("checking");
      setConnectionError(null);
      console.log("Checking proxy service connection...");
      
      // Add a timeout for the connection check
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection test timed out")), 8000);
      });
      
      // Actual connection check
      const connectionPromise = supabase.functions.invoke("pdf-proxy", {
        body: { action: "connection_test" },
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      // Race between the timeout and the actual request
      const { data, error } = await Promise.race([
        connectionPromise,
        timeoutPromise.then(() => {
          throw new Error("Connection test timed out");
        })
      ]) as any;
      
      if (error) {
        console.error("Connection test failed with error:", error);
        setConnectionStatus("error");
        setConnectionError(error.message || "Unknown connection error");
        
        // Implement automatic retry logic (up to MAX_RETRIES)
        if (retryCount < MAX_RETRIES) {
          console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => checkConnection(true), 2000);
        } else {
          toast({
            title: "Proxy Service Unavailable",
            description: "The document extraction service is currently unreachable. You can still use the database storage option.",
            variant: "destructive",
          });
          setRetryCount(0);
        }
        
        return "error";
      }
      
      console.log("Connection test succeeded:", data);
      setConnectionStatus("connected");
      setRetryCount(0);
      return "connected";
    } catch (err) {
      console.error("Connection test error:", err);
      setConnectionStatus("error");
      setConnectionError(err.message || "Unknown error occurred");
      
      // Implement automatic retry logic (up to MAX_RETRIES)
      if (retryCount < MAX_RETRIES) {
        console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => checkConnection(true), 2000);
      } else {
        toast({
          title: "Proxy Service Unavailable",
          description: "The document extraction service is currently unreachable. You can still use the database storage option.",
          variant: "destructive",
        });
        setRetryCount(0);
      }
      
      return "error";
    } finally {
      setLastChecked(new Date());
    }
  }, [lastChecked, connectionStatus, retryCount, toast]);
    
  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return { 
    connectionStatus, 
    connectionError,
    checkConnection 
  };
};
