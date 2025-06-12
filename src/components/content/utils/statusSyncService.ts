
import { supabase } from "@/integrations/supabase/client";

/**
 * Synchronizes document statuses based on actual data presence
 */
export async function syncDocumentStatuses(): Promise<{ updated: number; total: number }> {
  try {
    console.log("Starting document status synchronization...");
    
    // Get all documents
    const { data: documents, error: docsError } = await supabase
      .from("processed_documents")
      .select("id, title, status");
    
    if (docsError) {
      console.error("Error fetching documents for status sync:", docsError);
      throw docsError;
    }
    
    if (!documents || documents.length === 0) {
      console.log("No documents found for status sync");
      return { updated: 0, total: 0 };
    }
    
    let updatedCount = 0;
    
    for (const doc of documents) {
      // Check if document has chunks
      const { count: chunkCount } = await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true })
        .eq("document_id", doc.id);
      
      // Check if document has embeddings
      const { count: embeddingCount } = await supabase
        .from("document_embeddings")
        .select("*", { count: "exact", head: true })
        .eq("document_id", doc.id);
      
      const hasChunks = (chunkCount || 0) > 0;
      const hasEmbeddings = (embeddingCount || 0) > 0;
      
      // Determine correct status
      let correctStatus = doc.status;
      if (hasChunks && hasEmbeddings && doc.status !== "completed") {
        correctStatus = "completed";
      } else if ((!hasChunks || !hasEmbeddings) && doc.status === "completed") {
        correctStatus = "pending";
      }
      
      // Update if status needs to change
      if (correctStatus !== doc.status) {
        console.log(`Updating document "${doc.title}" status from "${doc.status}" to "${correctStatus}"`);
        
        const { error: updateError } = await supabase
          .from("processed_documents")
          .update({
            status: correctStatus,
            processed_at: correctStatus === "completed" ? new Date().toISOString() : null,
            error: null
          })
          .eq("id", doc.id);
        
        if (updateError) {
          console.error(`Error updating status for document ${doc.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }
    
    console.log(`Status sync completed: updated ${updatedCount} out of ${documents.length} documents`);
    return { updated: updatedCount, total: documents.length };
    
  } catch (error) {
    console.error("Error in syncDocumentStatuses:", error);
    throw error;
  }
}
