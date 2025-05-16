
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";

/**
 * Fetches processed documents from the database
 */
export async function fetchProcessedDocuments(): Promise<ProcessedDocument[]> {
  try {
    console.log("Fetching processed documents from the database");
    
    // Add some logging for debugging
    const { data: testData, error: testError } = await supabase
      .from("processed_documents")
      .select("count", { count: "exact", head: true });
    
    if (testError) {
      console.error("Error checking processed_documents count:", testError);
    } else {
      // Safely access the count property - check if testData exists first
      const count = testData !== null ? (testData as any).count : 0;
      console.log("Number of documents in processed_documents table:", count);
    }
    
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
