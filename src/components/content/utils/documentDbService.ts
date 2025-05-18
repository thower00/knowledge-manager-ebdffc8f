
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
    
    // Delete all documents at once (more efficient than one-by-one)
    const { error } = await supabase
      .from("processed_documents")
      .delete()
      .in("id", documentIds);
    
    if (error) {
      console.error("Error deleting documents:", error);
      return false;
    }
    
    // Perform verification to confirm documents were deleted
    const { data: remainingDocs, error: verifyError } = await supabase
      .from("processed_documents")
      .select("id")
      .in("id", documentIds);
    
    if (verifyError) {
      console.error("Error verifying document deletion:", verifyError);
      return false;
    }
    
    const docsRemaining = remainingDocs?.length || 0;
    if (docsRemaining > 0) {
      console.warn(`Warning: ${docsRemaining} documents still exist after deletion attempt`);
      console.warn("Remaining document IDs:", remainingDocs?.map(doc => doc.id));
      return false;
    }
    
    console.log(`Verification successful: All ${documentIds.length} documents were deleted`);
    return true;
  } catch (err) {
    console.error("Exception in deleteProcessedDocuments:", err);
    throw err;
  }
}
