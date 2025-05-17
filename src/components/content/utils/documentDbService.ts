
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";

/**
 * Fetches processed documents from the database
 */
export async function fetchProcessedDocuments(): Promise<ProcessedDocument[]> {
  try {
    console.log("Fetching processed documents from the database");
    
    // Actual data fetch with better error handling
    const { data, error } = await supabase
      .from("processed_documents")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching processed documents:", error);
      throw new Error(error.message || "Failed to fetch processed documents");
    }
    
    if (!data) {
      console.log("No processed documents found");
      return [];
    }
    
    console.log("Fetched processed documents:", data);
    return data as ProcessedDocument[];
  } catch (err) {
    console.error("Exception in fetchProcessedDocuments:", err);
    throw err;
  }
}

/**
 * Deletes processed documents from the database
 */
export async function deleteProcessedDocuments(documentIds: string[]): Promise<void> {
  try {
    if (documentIds.length === 0) {
      console.log("No document IDs provided for deletion");
      return;
    }
    
    console.log("Attempting to delete documents with IDs:", documentIds);
    
    // More explicit deletion with improved error checking
    const { error, data } = await supabase
      .from("processed_documents")
      .delete()
      .in("id", documentIds)
      .select(); // Ask for the deleted data to confirm deletion
    
    if (error) {
      console.error("Database error when deleting documents:", error);
      throw new Error(`Failed to delete documents: ${error.message}`);
    }
    
    console.log("Successfully deleted documents. Response data:", data);
  } catch (err) {
    console.error("Exception in deleteProcessedDocuments:", err);
    throw err;
  }
}
