
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
 * Deletes processed documents from the database with improved reliability
 */
export async function deleteProcessedDocuments(documentIds: string[]): Promise<boolean> {
  try {
    if (documentIds.length === 0) {
      console.log("No document IDs provided for deletion");
      return true; // Nothing to delete is a success
    }
    
    console.log("Attempting to delete documents with IDs:", documentIds);
    
    // Delete documents one by one to ensure better tracing of failures
    const results = await Promise.all(
      documentIds.map(async (id) => {
        try {
          const { error } = await supabase
            .from("processed_documents")
            .delete()
            .eq("id", id);
          
          if (error) {
            console.error(`Error deleting document ${id}:`, error);
            return { id, success: false, error: error.message };
          }
          
          return { id, success: true };
        } catch (err) {
          console.error(`Exception deleting document ${id}:`, err);
          return { id, success: false, error: String(err) };
        }
      })
    );
    
    // Check results
    const failures = results.filter(r => !r.success);
    
    if (failures.length > 0) {
      const failedIds = failures.map(f => f.id);
      console.error("Failed to delete documents:", failedIds, failures);
      return false;
    }
    
    console.log(`Successfully deleted ${documentIds.length} documents`);
    return true;
  } catch (err) {
    console.error("Exception in deleteProcessedDocuments:", err);
    return false;
  }
}
