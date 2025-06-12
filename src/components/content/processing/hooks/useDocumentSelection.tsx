
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments } from "../../utils/documentDbService";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from '@supabase/supabase-js';

export function useDocumentSelection() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadDocuments = async (forceFresh = false) => {
    console.log("useDocumentSelection - Loading documents", { forceFresh });
    setIsLoading(true);
    try {
      let docs: ProcessedDocument[];
      
      if (forceFresh) {
        // Use a completely fresh client to bypass all caching
        const timestamp = Date.now();
        const freshClient = createClient(
          'https://sxrinuxxlmytddymjbmr.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0',
          {
            db: {
              schema: 'public'
            },
            global: {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Timestamp': timestamp.toString()
              }
            }
          }
        );
        
        console.log('Using fresh client to fetch documents with timestamp:', timestamp);
        const { data, error } = await freshClient
          .from('processed_documents')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        docs = data as ProcessedDocument[];
        console.log(`Fresh fetch returned ${docs.length} documents`);
      } else {
        docs = await fetchProcessedDocuments();
      }
      
      console.log(`useDocumentSelection - Fetched ${docs.length} documents`);
      
      // Only show pending documents that are ready for processing
      const pendingDocs = docs.filter(doc => doc.status === 'pending');
      setDocuments(pendingDocs);
      console.log(`useDocumentSelection - Filtered to ${pendingDocs.length} pending documents`);
    } catch (err) {
      console.error("Error loading documents for processing:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load processed documents",
      });
    } finally {
      setIsLoading(false);
      console.log("useDocumentSelection - Documents loading complete");
    }
  };

  // Load documents when component mounts
  useEffect(() => {
    console.log("useDocumentSelection - Initial mount");
    loadDocuments();
  }, []);

  const handleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedDocuments(documents.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const refreshDocuments = (forceFresh = false) => {
    console.log("useDocumentSelection - Manual refresh triggered", { forceFresh });
    loadDocuments(forceFresh);
  };

  return {
    documents,
    selectedDocuments,
    isLoading,
    handleDocumentSelection,
    handleSelectAll,
    refreshDocuments,
  };
}
