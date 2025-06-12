
import { supabase } from "@/integrations/supabase/client";

export interface SyncResult {
  updated: number;
  total: number;
  details: Array<{
    documentId: string;
    title: string;
    oldStatus: string;
    newStatus: string;
    chunksCount: number;
    embeddingsCount: number;
    updated: boolean;
  }>;
  errors: string[];
}

/**
 * Enhanced document status synchronization using database functions
 */
export async function enhancedSyncDocumentStatuses(): Promise<SyncResult> {
  try {
    console.log("=== STARTING ENHANCED DOCUMENT STATUS SYNC ===");
    
    // Use the new batch sync database function
    const { data: syncResults, error } = await supabase
      .rpc('batch_sync_document_statuses');
    
    if (error) {
      console.error("Database function error:", error);
      throw new Error(`Database sync function failed: ${error.message}`);
    }
    
    if (!syncResults || syncResults.length === 0) {
      console.log("No documents found for sync");
      return {
        updated: 0,
        total: 0,
        details: [],
        errors: []
      };
    }
    
    console.log(`Batch sync function returned ${syncResults.length} results`);
    
    // Process the results
    const details = syncResults.map(result => ({
      documentId: result.document_id,
      title: result.title,
      oldStatus: result.old_status,
      newStatus: result.new_status,
      chunksCount: result.chunks_count,
      embeddingsCount: result.embeddings_count,
      updated: result.updated
    }));
    
    const updatedCount = details.filter(d => d.updated).length;
    const errors: string[] = [];
    
    // Log detailed results
    console.log("=== SYNC RESULTS SUMMARY ===");
    console.log(`Total documents processed: ${details.length}`);
    console.log(`Documents updated: ${updatedCount}`);
    
    details.forEach(detail => {
      if (detail.updated) {
        console.log(`✓ Updated "${detail.title}": ${detail.oldStatus} → ${detail.newStatus} (chunks: ${detail.chunksCount}, embeddings: ${detail.embeddingsCount})`);
      } else {
        console.log(`- No change for "${detail.title}": ${detail.newStatus} (chunks: ${detail.chunksCount}, embeddings: ${detail.embeddingsCount})`);
      }
    });
    
    console.log("=== ENHANCED SYNC COMPLETED ===");
    
    return {
      updated: updatedCount,
      total: details.length,
      details,
      errors
    };
    
  } catch (error) {
    console.error("Enhanced sync failed:", error);
    return {
      updated: 0,
      total: 0,
      details: [],
      errors: [error instanceof Error ? error.message : 'Unknown sync error']
    };
  }
}

/**
 * Sync a single document status using the database function
 */
export async function syncSingleDocumentStatus(
  documentId: string, 
  newStatus: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string
): Promise<boolean> {
  try {
    console.log(`Syncing single document ${documentId} to status: ${newStatus}`);
    
    const processedAt = newStatus === 'completed' ? new Date().toISOString() : null;
    
    const { data: success, error: dbError } = await supabase
      .rpc('sync_document_status', {
        doc_id: documentId,
        new_status: newStatus,
        new_processed_at: processedAt,
        new_error: error || null
      });
    
    if (dbError) {
      console.error("Single document sync error:", dbError);
      throw new Error(`Failed to sync document: ${dbError.message}`);
    }
    
    console.log(`Single document sync result: ${success ? 'SUCCESS' : 'FAILED'}`);
    return success || false;
    
  } catch (error) {
    console.error(`Error syncing single document ${documentId}:`, error);
    return false;
  }
}

/**
 * Wait for database changes to propagate and verify sync completion
 */
export async function waitForSyncCompletion(
  expectedUpdates: number,
  timeoutMs: number = 10000
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 1000; // Check every second
  
  console.log(`Waiting for sync completion (expecting ${expectedUpdates} updates, timeout: ${timeoutMs}ms)`);
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // Check if all documents have the correct status
      const { data: docs, error } = await supabase
        .from('processed_documents')
        .select(`
          id, 
          title, 
          status,
          document_chunks(count),
          document_embeddings(count)
        `);
      
      if (error) {
        console.error("Error checking sync completion:", error);
        return false;
      }
      
      let correctCount = 0;
      for (const doc of docs || []) {
        const chunksCount = doc.document_chunks?.[0]?.count || 0;
        const embeddingsCount = doc.document_embeddings?.[0]?.count || 0;
        
        const shouldBeCompleted = chunksCount > 0 && embeddingsCount > 0;
        const isCorrect = shouldBeCompleted ? doc.status === 'completed' : doc.status === 'pending';
        
        if (isCorrect) correctCount++;
      }
      
      console.log(`Sync verification: ${correctCount}/${docs?.length || 0} documents have correct status`);
      
      if (correctCount === (docs?.length || 0)) {
        console.log("✓ Sync completion verified");
        return true;
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      console.error("Error during sync verification:", error);
      return false;
    }
  }
  
  console.warn("Sync verification timed out");
  return false;
}
