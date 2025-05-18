
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
    
    // Use RPC call for deletion to ensure we get a proper response
    const { data, error } = await supabase.rpc('delete_documents', {
      doc_ids: documentIds
    });
    
    if (error) {
      console.error("Error in delete_documents RPC:", error);
      return false;
    }
    
    console.log("RPC delete response:", data);
    
    // If the RPC call is successful, we'll assume deletion worked
    // Let's double-check by querying for the documents anyway
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
