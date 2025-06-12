
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
    
    console.log(`Found ${documents.length} documents to check for status sync`);
    let updatedCount = 0;
    
    for (const doc of documents) {
      console.log(`Checking document "${doc.title}" (${doc.id}) with current status: ${doc.status}`);
      
      // Check if document has chunks
      const { count: chunkCount, error: chunkError } = await supabase
        .from("document_chunks")
        .select("*", { count: "exact", head: true })
        .eq("document_id", doc.id);
      
      if (chunkError) {
        console.error(`Error counting chunks for document ${doc.id}:`, chunkError);
        continue;
      }
      
      // Check if document has embeddings
      const { count: embeddingCount, error: embeddingError } = await supabase
        .from("document_embeddings")
        .select("*", { count: "exact", head: true })
        .eq("document_id", doc.id);
      
      if (embeddingError) {
        console.error(`Error counting embeddings for document ${doc.id}:`, embeddingError);
        continue;
      }
      
      const hasChunks = (chunkCount || 0) > 0;
      const hasEmbeddings = (embeddingCount || 0) > 0;
      
      console.log(`Document "${doc.title}": chunks=${chunkCount}, embeddings=${embeddingCount}, hasChunks=${hasChunks}, hasEmbeddings=${hasEmbeddings}`);
      
      // Determine correct status based on data presence
      let correctStatus = doc.status;
      let shouldUpdate = false;
      
      if (hasChunks && hasEmbeddings) {
        // Document has both chunks and embeddings - should be completed
        if (doc.status !== "completed") {
          correctStatus = "completed";
          shouldUpdate = true;
          console.log(`Document "${doc.title}" should be completed (has ${chunkCount} chunks and ${embeddingCount} embeddings)`);
        }
      } else {
        // Document is missing chunks or embeddings - should be pending or failed
        if (doc.status === "completed") {
          correctStatus = "pending";
          shouldUpdate = true;
          console.log(`Document "${doc.title}" should not be completed (missing chunks or embeddings)`);
        }
      }
      
      // Update if status needs to change
      if (shouldUpdate) {
        console.log(`Updating document "${doc.title}" status from "${doc.status}" to "${correctStatus}"`);
        
        const updateData: any = {
          status: correctStatus,
        };
        
        if (correctStatus === "completed") {
          updateData.processed_at = new Date().toISOString();
          updateData.error = null;
        } else if (correctStatus === "pending") {
          updateData.processed_at = null;
          updateData.error = null;
        }
        
        const { error: updateError } = await supabase
          .from("processed_documents")
          .update(updateData)
          .eq("id", doc.id);
        
        if (updateError) {
          console.error(`Error updating status for document ${doc.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`Successfully updated document "${doc.title}" to status "${correctStatus}"`);
        }
      } else {
        console.log(`Document "${doc.title}" status "${doc.status}" is already correct`);
      }
    }
    
    console.log(`Status sync completed: updated ${updatedCount} out of ${documents.length} documents`);
    return { updated: updatedCount, total: documents.length };
    
  } catch (error) {
    console.error("Error in syncDocumentStatuses:", error);
    throw error;
  }
}
