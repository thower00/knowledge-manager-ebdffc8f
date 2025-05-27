
import { useState, useEffect } from "react";

/**
 * Hook for extraction initialization - simplified version
 */
export function useExtractionInitialization() {
  const [proxyConnected, setProxyConnected] = useState<boolean>(true);
  
  // Simple refresh handler
  const handleRefresh = async () => {
    console.log("Refreshing extraction state");
    // No longer need to check proxy connections for file extraction
    setProxyConnected(true);
  };

  useEffect(() => {
    // Initialize as connected since we're using direct file extraction
    setProxyConnected(true);
  }, []);

  return {
    proxyConnected,
    handleRefresh
  };
}
