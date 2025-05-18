
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
      return true; // Nothing to delete is a success
    }
    
    console.log("Attempting to delete documents with IDs:", documentIds);
    
    // Direct delete approach with explicit logging
    const { error } = await supabase
      .from("processed_documents")
      .delete()
      .in("id", documentIds);
    
    if (error) {
      console.error("Error deleting documents:", error);
      return false;
    }
    
    // Verify the deletion by checking if the documents still exist
    const { data: remainingDocs } = await supabase
      .from("processed_documents")
      .select("id")
      .in("id", documentIds);
    
    if (remainingDocs && remainingDocs.length > 0) {
      console.error(`${remainingDocs.length} documents still exist after deletion attempt`);
      return false;
    }
    
    console.log(`Successfully deleted ${documentIds.length} documents`);
    return true;
  } catch (err) {
    console.error("Exception in deleteProcessedDocuments:", err);
    return false;
  }
}
