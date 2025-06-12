
import { enhancedSyncDocumentStatuses } from "./enhancedStatusSyncService";

/**
 * Legacy compatibility wrapper for the enhanced sync service
 * @deprecated Use enhancedSyncDocumentStatuses directly
 */
export async function syncDocumentStatuses(): Promise<{ updated: number; total: number }> {
  console.warn("Using legacy syncDocumentStatuses. Consider upgrading to enhancedSyncDocumentStatuses for better error handling.");
  
  const result = await enhancedSyncDocumentStatuses();
  
  return {
    updated: result.updated,
    total: result.total
  };
}
