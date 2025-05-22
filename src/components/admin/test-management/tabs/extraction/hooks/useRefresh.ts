
import { useCallback } from "react";

export const useRefresh = (
  refreshDocuments: () => Promise<void>,
  checkProxyConnection: () => Promise<boolean>
) => {
  // Helper function for refreshing documents and connection
  const handleRefresh = useCallback(async () => {
    await refreshDocuments();
    await checkProxyConnection();
  }, [refreshDocuments, checkProxyConnection]);

  return {
    handleRefresh
  };
};
