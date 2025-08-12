import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to check and monitor the proxy connection status
 */
export const useProxyConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number>(0);
  const { toast } = useToast();
  
  // Track check in progress to prevent concurrent checks
  const checkInProgress = useRef<boolean>(false);
  
  // Keep track of connection history for stability analysis
  const connectionHistory = useRef<Array<{status: string, timestamp: number}>>([]);
  
  // Function to add entry to connection history
  const addToConnectionHistory = useCallback((status: string) => {
    const history = connectionHistory.current;
    history.push({ status, timestamp: Date.now() });
    
    // Keep only last 10 entries
    if (history.length > 10) {
      history.shift();
    }
    
    // Log connection history for debugging
    console.log("Connection history:", history);
  }, []);

  /**
   * Check the connection to the proxy service
   * @param forceCheck Force a new check even if already connected
   * @returns Connection status after checking
   */
  const checkConnection = useCallback(async (forceCheck = false): Promise<'connected' | 'error'> => {
    // Don't check if already checking or if checked recently (unless forced)
    const now = Date.now();
    if (checkInProgress.current) {
      console.log("Check already in progress, skipping");
      return connectionStatus === 'connected' ? 'connected' : 'error';
    }
    
    if (!forceCheck && (now - lastCheckedAt < 30000) && connectionStatus !== 'idle') {
      console.log("Skipping check, last check was less than 30 seconds ago");
      return connectionStatus === 'connected' ? 'connected' : 'error';
    }

    checkInProgress.current = true;
    setConnectionStatus('checking');
    console.log("Checking proxy service connection...");
    
    const retries = 2;
    let currentRetry = 0;
    
    while (currentRetry <= retries) {
      try {
        console.log(`Connection check attempt ${currentRetry + 1} of ${retries + 1}`);
        
        // Add a nonce to prevent caching issues
        const nonce = Math.random().toString(36).substring(2, 10);
        const { data, error: functionError } = await supabase.functions.invoke("pdf-proxy", {
          body: { 
            action: "connection_test",
            timestamp: Date.now(),
            nonce
          }
        });

        if (functionError) {
          console.error("Function error during connection check:", functionError);
          throw functionError;
        }

        if (data && data.status === "connected") {
          console.log("Proxy service connection successful:", data.message || "Connected");
          setConnectionStatus('connected');
          setConnectionError(null);
          setLastCheckedAt(now);
          addToConnectionHistory('connected');
          checkInProgress.current = false;
          return 'connected';
        } else {
          console.error("Invalid response from proxy service:", data);
          throw new Error("Invalid response from proxy service");
        }
      } catch (error) {
        console.error(`Connection test attempt ${currentRetry + 1} failed with error:`, error);
        
        if (currentRetry < retries) {
          currentRetry++;
          console.log(`Retry attempt ${currentRetry} of ${retries}...`);
          // Wait with increasing backoff before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (currentRetry)));
        } else {
          let errorMessage = "Failed to connect to proxy service";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          setConnectionStatus('error');
          setConnectionError(errorMessage);
          setLastCheckedAt(now);
          addToConnectionHistory('error');
          
          if (forceCheck) {
            toast({
              variant: "destructive",
              title: "Connection Failed",
              description: "Unable to connect to the PDF proxy service"
            });
          }
          
          checkInProgress.current = false;
          return 'error';
        }
      }
    }
    
    // This should never be reached due to the returns above, but TypeScript requires it
    checkInProgress.current = false;
    return 'error';
  }, [connectionStatus, lastCheckedAt, toast, addToConnectionHistory]);

  // Initial connection check on mount with slight delay to ensure component is fully mounted
  useEffect(() => {
    let mounted = true;
    
    const initialCheck = async () => {
      // Add slight delay to ensure component is fully mounted
      await new Promise(resolve => setTimeout(resolve, 800));
      if (mounted) {
        await checkConnection();
      }
    };
    
    initialCheck();
    
    // Check connection periodically to ensure it's still available
    // Use a more frequent check initially, then back off
    const quickCheckId = setTimeout(() => {
      if (mounted && connectionStatus !== 'connected') {
        checkConnection(false);
      }
    }, 10000); // Quick follow-up check after 10s if not connected
    
    const intervalId = setInterval(() => {
      if (mounted) {
        checkConnection(false);
      }
    }, 3 * 60 * 1000); // Regular check every 3 minutes
    
    return () => {
      mounted = false;
      clearTimeout(quickCheckId);
      clearInterval(intervalId);
    };
  }, [checkConnection, connectionStatus]);

  // Method to get connection stability information based on history
  const getConnectionStability = useCallback(() => {
    const history = connectionHistory.current;
    if (history.length < 3) return { stable: true, percentage: 100 };
    
    const successCount = history.filter(entry => entry.status === 'connected').length;
    const stability = Math.round((successCount / history.length) * 100);
    
    return {
      stable: stability >= 70, // Consider stable if 70%+ success
      percentage: stability
    };
  }, []);

  return {
    connectionStatus,
    connectionError,
    checkConnection,
    getConnectionStability
  };
};
