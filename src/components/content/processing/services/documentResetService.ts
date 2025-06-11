
import { supabase } from "@/integrations/supabase/client";

export interface DocumentResetResult {
  success: boolean;
  message: string;
  documentsReset?: number;
}

export class DocumentResetService {
  /**
   * Reset documents with failed or completed status back to pending
   */
  static async resetDocuments(documentIds: string[]): Promise<DocumentResetResult> {
    if (!documentIds || documentIds.length === 0) {
      return {
        success: false,
        message: "No documents specified for reset"
      };
    }

    try {
      console.log(`Resetting ${documentIds.length} documents to pending status`);
      
      const { data, error } = await supabase
        .from('processed_documents')
        .update({ 
          status: 'pending',
          processed_at: null,
          error: null
        })
        .in('id', documentIds)
        .select('id');

      if (error) {
        console.error('Error resetting documents:', error);
        return {
          success: false,
          message: `Failed to reset documents: ${error.message}`
        };
      }

      const resetCount = data?.length || 0;
      console.log(`Successfully reset ${resetCount} documents`);
      
      return {
        success: true,
        message: `Successfully reset ${resetCount} document(s) to pending status`,
        documentsReset: resetCount
      };
    } catch (error) {
      console.error('Error in resetDocuments:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Reset all failed documents back to pending
   */
  static async resetFailedDocuments(): Promise<DocumentResetResult> {
    try {
      console.log('Resetting all failed documents to pending status');
      
      const { data, error } = await supabase
        .from('processed_documents')
        .update({ 
          status: 'pending',
          processed_at: null,
          error: null
        })
        .eq('status', 'failed')
        .select('id');

      if (error) {
        console.error('Error resetting failed documents:', error);
        return {
          success: false,
          message: `Failed to reset failed documents: ${error.message}`
        };
      }

      const resetCount = data?.length || 0;
      console.log(`Successfully reset ${resetCount} failed documents`);
      
      return {
        success: true,
        message: resetCount > 0 
          ? `Successfully reset ${resetCount} failed document(s) to pending status`
          : 'No failed documents found to reset',
        documentsReset: resetCount
      };
    } catch (error) {
      console.error('Error in resetFailedDocuments:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
