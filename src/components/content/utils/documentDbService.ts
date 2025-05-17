
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
    
    console.log("Deleting documents with IDs:", documentIds);
    
    // Fix: Remove the .select("count") that causes the aggregate function error
    const { error } = await supabase
      .from("processed_documents")
      .delete()
      .in("id", documentIds);
    
    if (error) {
      console.error("Database error when deleting documents:", error);
      throw new Error(`Failed to delete documents: ${error.message}`);
    }
    
    // Log successful deletion
    console.log(`Successfully requested deletion for documents with IDs:`, documentIds);
    
    // Verify the deletion by checking if documents still exist
    const { data: remainingDocs } = await supabase
      .from("processed_documents")
      .select("id")
      .in("id", documentIds);
    
    const deletedCount = documentIds.length - (remainingDocs?.length || 0);
    console.log(`Verification: ${deletedCount} documents were deleted`);
    
    return true;
  } catch (err) {
    console.error("Exception in deleteProcessedDocuments:", err);
    throw err;
  }
}
