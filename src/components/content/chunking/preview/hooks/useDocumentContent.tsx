
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useDocumentContent(documentId: string) {
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!documentId) return;
    
    const fetchDocument = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch the document details
        const { data: documentData, error: documentError } = await supabase
          .from('processed_documents')
          .select('id, title, source_id, mime_type')
          .eq('id', documentId)
          .single();
        
        if (documentError) {
          throw documentError;
        }
        
        if (!documentData) {
          throw new Error("Document not found");
        }
        
        // Fetch document binary content
        const { data: binaryData, error: binaryError } = await supabase
          .from('document_binaries')
          .select('binary_data, content_type')
          .eq('document_id', documentId)
          .maybeSingle();
          
        if (binaryError) {
          console.error("Error fetching document binary:", binaryError);
        }
        
        let documentContent = "";
        
        if (binaryData?.binary_data) {
          try {
            // Try to extract text content from binary data
            documentContent = new TextDecoder().decode(base64ToArrayBuffer(binaryData.binary_data));
            console.log(`Successfully decoded document content, length: ${documentContent.length}`);
          } catch (decodeError) {
            console.error("Error decoding binary data:", decodeError);
            documentContent = "Error: Could not decode document content.";
          }
        } else {
          // Fallback to loading content via a separate API call
          // This would be a good place to implement additional content loading methods
          documentContent = `This is a placeholder for the document content. In a production environment, this would contain the actual text of "${documentData.title}".`;
          console.log("No binary data found, using placeholder text");
        }
        
        // Enrich document data with content
        setDocument({
          ...documentData,
          content: documentContent
        });
      } catch (err) {
        console.error("Error loading document content:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          variant: "destructive",
          title: "Error loading document",
          description: "Failed to load document content for chunking."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId, toast]);

  const viewFullDocument = () => {
    if (!document?.content) return;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${document?.title || 'Document Preview'}</title>
            <style>
              body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
              h1 { margin-bottom: 2rem; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${document?.title || 'Document Preview'}</h1>
            <pre>${document?.content || ''}</pre>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  // Helper function to convert base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  return {
    document,
    isLoading,
    error,
    viewFullDocument
  };
}
