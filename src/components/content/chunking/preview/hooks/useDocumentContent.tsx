
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { fetchDocumentFromDatabase } from "@/components/admin/document-extraction/services/documentFetchService";
import { extractPdfText } from "@/components/admin/document-extraction/utils/pdfUtils";

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
        const binaryData = await fetchDocumentFromDatabase(documentId);
        
        let documentContent = "";
        
        if (binaryData) {
          try {
            console.log("Successfully retrieved document binary data, extracting text...");
            
            // Extract text based on mime type
            if (documentData.mime_type.includes('pdf')) {
              documentContent = await extractPdfText(binaryData, progress => {
                console.log(`PDF extraction progress: ${progress}%`);
              });
            } else {
              // For non-PDF files, attempt to decode as text
              documentContent = new TextDecoder().decode(binaryData);
            }
            
            console.log(`Successfully extracted document content, length: ${documentContent.length}`);
          } catch (extractError) {
            console.error("Error extracting document content:", extractError);
            documentContent = `Error extracting content: ${extractError.message}`;
            throw new Error(`Failed to extract document content: ${extractError.message}`);
          }
        } else {
          // No binary data found - this should now trigger an error
          console.error("No binary data found for document ID:", documentId);
          throw new Error("Document content not available. The document binary may not exist in the database.");
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
          description: err instanceof Error ? err.message : "Failed to load document content for chunking."
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

  return {
    document,
    isLoading,
    error,
    viewFullDocument
  };
}
