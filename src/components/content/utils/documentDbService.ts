
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";

/**
 * Fetches processed documents from the database
 */
export async function fetchProcessedDocuments(): Promise<ProcessedDocument[]> {
  try {
    console.log("Fetching processed documents from the database");
    
    const { data, error } = await supabase
      .from("processed_documents")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching processed documents:", error);
      throw new Error(error.message || "Failed to fetch processed documents");
    }
    
    console.log(`Fetched ${data?.length || 0} processed documents`);
    return data as ProcessedDocument[] || [];
  } catch (err) {
    console.error("Exception in fetchProcessedDocuments:", err);
    throw err;
  }
}

/**
 * Deletes processed documents from the database
 */
export async function deleteProcessedDocuments(documentIds: string[]): Promise<boolean> {
  try {
    if (documentIds.length === 0) {
      console.log("No document IDs provided for deletion");
      return false;
    }
    
    console.log("Attempting to delete documents with IDs:", documentIds);
    
    // Delete documents one by one with verification after each deletion
    let successCount = 0;
    
    for (const docId of documentIds) {
      console.log(`Attempting to delete document ID: ${docId}`);
      
      // First deletion attempt
      const { error: deleteError } = await supabase
        .from("processed_documents")
        .delete()
        .eq("id", docId);
      
      if (deleteError) {
        console.error(`Error deleting document ${docId}:`, deleteError);
        continue;
      }
      
      // Verify the document was deleted
      const { data: checkData, error: checkError } = await supabase
        .from("processed_documents")
        .select("id")
        .eq("id", docId);
      
      if (checkError) {
        console.error(`Error verifying deletion for document ${docId}:`, checkError);
        continue;
      }
      
      if (checkData && checkData.length > 0) {
        console.warn(`Document ${docId} still exists after deletion attempt`);
        
        // Try one more time with a stronger deletion
        const { error: retryError } = await supabase
          .from("processed_documents")
          .delete()
          .eq("id", docId);
        
        // Fixed line - removed the .is(docId) call that was causing the error
        
        if (retryError) {
          console.error(`Error on retry deletion for document ${docId}:`, retryError);
          continue;
        }
        
        // Verify again
        const { data: recheckData } = await supabase
          .from("processed_documents")
          .select("id")
          .eq("id", docId);
        
        if (recheckData && recheckData.length > 0) {
          console.error(`Document ${docId} could not be deleted after retry`);
          continue;
        }
      }
      
      // If we get here, the document was successfully deleted
      console.log(`Successfully deleted document ID: ${docId}`);
      successCount++;
    }
    
    const allDeleted = successCount === documentIds.length;
    console.log(`Deletion summary: ${successCount}/${documentIds.length} documents deleted successfully`);
    
    return allDeleted;
  } catch (err) {
    console.error("Exception in deleteProcessedDocuments:", err);
    throw err;
  }
}
