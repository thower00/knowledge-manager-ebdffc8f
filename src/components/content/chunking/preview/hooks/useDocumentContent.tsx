
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ProcessedDocument {
  id: string;
  title: string;
  content?: string;
  status: string;
  mime_type: string;
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
        // First fetch the document metadata
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
        
        // Then fetch the binary data
        const { data: binaryData, error: binaryError } = await supabase
          .from('document_binaries')
          .select('binary_data, content_type')
          .eq('document_id', documentId)
          .maybeSingle();
          
        if (binaryError && binaryError.code !== 'PGRST116') { // Not found is ok
          throw new Error(`Error fetching document binary: ${binaryError.message}`);
        }
        
        // Create the document object with proper binary data handling
        let contentText: string | undefined = undefined;
        
        if (binaryData?.binary_data) {
          // Check what type of data we received and handle accordingly
          if (typeof binaryData.binary_data === 'string') {
            // If it's already a string, use directly
            contentText = binaryData.binary_data;
          } else if (ArrayBuffer.isView(binaryData.binary_data) || 
                    binaryData.binary_data.constructor?.name === 'Uint8Array') {
            // If it's an ArrayBuffer view (like Uint8Array), decode it
            try {
              contentText = new TextDecoder().decode(binaryData.binary_data as ArrayBufferLike);
            } catch (err) {
              console.error("Error decoding binary data:", err);
              contentText = JSON.stringify(binaryData.binary_data);
            }
          } else if (typeof binaryData.binary_data === 'object') {
            // If it's another array-like object, try to convert to Uint8Array first
            try {
              // Handle potential array-like objects
              const uint8Array = new Uint8Array(Object.values(binaryData.binary_data));
              contentText = new TextDecoder().decode(uint8Array);
            } catch (err) {
              console.error("Error converting binary data to string:", err);
              contentText = JSON.stringify(binaryData.binary_data);
            }
          }
        }
        
        const processedDoc: ProcessedDocument = {
          ...docData,
          content: contentText
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
    if (document) {
      // Create a new window with the document content
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>${document.title}</title>
              <style>
                body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
                pre { white-space: pre-wrap; background: #f1f1f1; padding: 1rem; border-radius: 4px; }
              </style>
            </head>
            <body>
              <h1>${document.title}</h1>
              <pre>${document.content || 'No content available'}</pre>
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  return {
    document,
    isLoading,
    error,
    viewFullDocument
  };
}
