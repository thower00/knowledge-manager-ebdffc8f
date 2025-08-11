
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProcessedDocument {
  id: string;
  title: string;
  content?: string;
  status: string;
  mime_type: string;
  url?: string;
  created_at: string;
  processed_at: string | null;
}

export function useDocumentContent(documentId: string) {
  const [document, setDocument] = useState<ProcessedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!documentId) return;
    
    async function fetchDocumentContent() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch the document metadata
        const { data: docData, error: docError } = await supabase
          .from('processed_documents')
          .select('*')
          .eq('id', documentId)
          .single();
          
        if (docError) {
          throw new Error(`Error fetching document: ${docError.message}`);
        }
        
        if (!docData) {
          throw new Error('Document not found');
        }
        
        const processedDoc: ProcessedDocument = {
          ...docData,
          content: undefined // We don't have content directly stored in the database
        };
        
        setDocument(processedDoc);
      } catch (err: any) {
        console.error('Error in document content fetch:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          variant: "destructive",
          title: "Error loading document",
          description: err.message
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDocumentContent();
  }, [documentId, toast]);
  
  const viewFullDocument = () => {
    if (document && document.url) {
      // Open the document in a new window using its Google Drive URL
      window.open(document.url, '_blank');
    } else {
      toast({
        variant: "destructive",
        title: "Cannot view document",
        description: "Document URL is not available."
      });
    }
  };

  return {
    document,
    isLoading,
    error,
    viewFullDocument
  };
}
