
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { enhancedSyncDocumentStatuses, waitForSyncCompletion, SyncResult } from "../../utils/enhancedStatusSyncService";

export function useEnhancedDocumentSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const performSync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    
    try {
      console.log("=== STARTING ENHANCED DOCUMENT SYNC ===");
      
      // Perform the sync
      const result = await enhancedSyncDocumentStatuses();
      setLastSyncResult(result);
      
      // Show appropriate toast messages
      if (result.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Sync completed with errors",
          description: `Updated ${result.updated} documents, but encountered ${result.errors.length} errors. Check console for details.`,
        });
      } else if (result.updated > 0) {
        toast({
          title: "Status sync completed",
          description: `Successfully updated ${result.updated} out of ${result.total} documents`,
        });
      } else {
        toast({
          title: "Status sync completed",
          description: "All documents already have the correct status",
        });
      }
      
      // Wait for changes to propagate
      if (result.updated > 0) {
        console.log("Waiting for database changes to propagate...");
        const syncVerified = await waitForSyncCompletion(result.updated, 15000);
        
        if (!syncVerified) {
          console.warn("Could not verify sync completion within timeout");
          toast({
            variant: "destructive",
            title: "Sync verification failed",
            description: "Status updates may still be propagating. Try refreshing in a moment.",
          });
        }
      }
      
      console.log("=== ENHANCED DOCUMENT SYNC COMPLETED ===");
      return result;
      
    } catch (error) {
      console.error("Enhanced sync failed:", error);
      
      const errorResult: SyncResult = {
        updated: 0,
        total: 0,
        details: [],
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      };
      
      setLastSyncResult(errorResult);
      
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error occurred during sync",
      });
      
      return errorResult;
      
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  const getSyncSummary = useCallback(() => {
    if (!lastSyncResult) return null;
    
    return {
      total: lastSyncResult.total,
      updated: lastSyncResult.updated,
      unchanged: lastSyncResult.total - lastSyncResult.updated,
      errors: lastSyncResult.errors.length,
      hasDetails: lastSyncResult.details.length > 0
    };
  }, [lastSyncResult]);

  return {
    isSyncing,
    lastSyncResult,
    performSync,
    getSyncSummary
  };
}
