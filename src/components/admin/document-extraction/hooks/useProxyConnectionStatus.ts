
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

/**
 * Hook to check and monitor the proxy connection status
 */
export const useProxyConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Check the connection to the proxy service
   * @param forceCheck Force a new check even if already connected
   * @returns Connection status after checking
   */
  const checkConnection = useCallback(async (forceCheck = false): Promise<'connected' | 'error'> => {
    // Don't check if already connected unless forced
    if (connectionStatus === 'connected' && !forceCheck) {
      return 'connected';
    }

    setConnectionStatus('checking');
    console.log("Checking proxy service connection...");
    
    let retries = 2;
    let currentRetry = 0;
    
    while (currentRetry <= retries) {
      try {
        const { data, error: functionError } = await supabase.functions.invoke("pdf-proxy", {
          body: { 
            action: "connection_test",
            timestamp: new Date().toISOString() // Add timestamp to prevent caching
          }
        });

        if (functionError) {
          throw functionError;
        }

        if (data && data.status === "connected") {
          console.log("Proxy service connection successful:", data.message || "Connected");
          setConnectionStatus('connected');
          setConnectionError(null);
          return 'connected';
        } else {
          throw new Error("Invalid response from proxy service");
        }
      } catch (error) {
        console.error("Connection test failed with error:", error);
        
        if (currentRetry < retries) {
          currentRetry++;
          console.log(`Retry attempt ${currentRetry} of ${retries}...`);
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          let errorMessage = "Failed to connect to proxy service";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          setConnectionStatus('error');
          setConnectionError(errorMessage);
          
          if (forceCheck) {
            toast({
              variant: "destructive",
              title: "Connection Failed",
              description: "Unable to connect to the PDF proxy service"
            });
          }
          
          return 'error';
        }
      }
    }
    
    // This should never be reached due to the returns above, but TypeScript requires it
    return 'error';
  }, [connectionStatus, toast]);

  // Initial connection check on mount
  useEffect(() => {
    const initialCheck = async () => {
      // Add slight delay to ensure component is fully mounted
      await new Promise(resolve => setTimeout(resolve, 500));
      await checkConnection();
    };
    
    initialCheck();
    
    // Check connection every 5 minutes to ensure it's still available
    const intervalId = setInterval(() => {
      checkConnection(false);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [checkConnection]);

  return {
    connectionStatus,
    connectionError,
    checkConnection
  };
};
