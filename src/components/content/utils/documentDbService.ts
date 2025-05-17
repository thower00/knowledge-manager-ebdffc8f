
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
      return;
    }
    
    console.log("Deleting processed documents:", documentIds);
    
    // Add more detailed debugging to trace the deletion process
    const response = await supabase
      .from("processed_documents")
      .delete()
      .in("id", documentIds);
    
    if (response.error) {
      console.error("Error deleting processed documents:", response.error);
      throw new Error(response.error.message || "Failed to delete processed documents");
    }
    
    console.log("Delete response:", response);
    console.log("Successfully deleted documents");
  } catch (err) {
    console.error("Exception in deleteProcessedDocuments:", err);
    throw err;
  }
}
