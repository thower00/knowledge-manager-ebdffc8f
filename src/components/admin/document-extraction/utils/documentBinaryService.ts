
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a document binary exists in the database
 * @param documentId ID of the document to check
 * @returns Promise resolving to boolean indicating if document binary exists
 */
export async function checkDocumentBinaryExists(documentId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('document_binaries')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);
    
    if (error) {
      console.error("Error checking document binary existence:", error);
      return false;
    }
    
    return count !== null && count > 0;
  } catch (error) {
    console.error("Exception in checkDocumentBinaryExists:", error);
    return false;
  }
}

/**
 * Get statistics about document binaries in the database
 * @returns Promise resolving to object containing statistics
 */
export async function getDocumentBinaryStats() {
  try {
    // Get total count of document binaries
    const { count: totalCount, error: countError } = await supabase
      .from('document_binaries')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    // Get total size by summing the file_size column
    const { data: sizeData, error: sizeError } = await supabase
      .from('document_binaries')
      .select('file_size');
    
    if (sizeError) {
      throw sizeError;
    }
    
    // Calculate total size by summing the file_size values
    const totalSize = sizeData ? sizeData.reduce((sum, item) => sum + Number(item.file_size || 0), 0) : 0;
    
    return {
      totalCount: totalCount || 0,
      totalSize: totalSize,
      averageSize: totalCount && totalSize ? Number(totalSize) / Number(totalCount) : 0
    };
  } catch (error) {
    console.error("Error fetching document binary stats:", error);
    return {
      totalCount: 0,
      totalSize: 0,
      averageSize: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Delete a document binary from the database
 * @param documentId ID of the document whose binary should be deleted
 * @returns Promise resolving to boolean indicating success
 */
export async function deleteDocumentBinary(documentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('document_binaries')
      .delete()
      .eq('document_id', documentId);
    
    if (error) {
      console.error("Error deleting document binary:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception in deleteDocumentBinary:", error);
    return false;
  }
}
