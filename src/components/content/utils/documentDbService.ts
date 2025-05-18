
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
 * Deletes processed documents from the database using a more reliable approach
 */
export async function deleteProcessedDocuments(documentIds: string[]): Promise<boolean> {
  try {
    if (documentIds.length === 0) {
      console.log("No document IDs provided for deletion");
      return false;
    }
    
    console.log("Attempting to delete documents with IDs:", documentIds);
    
    // Delete all documents in a single operation
    const { error } = await supabase
      .from("processed_documents")
      .delete()
      .in("id", documentIds);
    
    if (error) {
      console.error("Error deleting documents:", error);
      return false;
    }
    
    // Verify deletion was successful by checking if any of the documents still exist
    const { data: remainingDocs, error: verifyError } = await supabase
      .from("processed_documents")
      .select("id")
      .in("id", documentIds);
    
    if (verifyError) {
      console.error("Error verifying document deletion:", verifyError);
      return false;
    }
    
    const allDeleted = !remainingDocs || remainingDocs.length === 0;
    
    if (!allDeleted) {
      const remainingIds = remainingDocs.map(doc => doc.id);
      console.warn(`Some documents were not deleted: ${remainingIds.join(", ")}`);
    } else {
      console.log(`Successfully deleted ${documentIds.length} documents`);
    }
    
    return allDeleted;
  } catch (err) {
    console.error("Exception in deleteProcessedDocuments:", err);
    return false;
  }
}
