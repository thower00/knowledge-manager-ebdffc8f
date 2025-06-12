
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments } from "../../utils/documentDbService";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from '@supabase/supabase-js';

export function useDocumentSelection() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const { toast } = useToast();

  const loadDocuments = async (forceFresh = false) => {
    console.log("useDocumentSelection - Loading documents", { forceFresh, lastRefreshTime });
    setIsLoading(true);
    
    try {
      let docs: ProcessedDocument[];
      
      if (forceFresh) {
        // Use a completely fresh client to bypass all caching
        const timestamp = Date.now();
        setLastRefreshTime(timestamp);
        
        const freshClient = createClient(
          'https://sxrinuxxlmytddymjbmr.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0',
          {
            db: { schema: 'public' },
            global: {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Timestamp': timestamp.toString(),
                'X-Force-Refresh': 'true'
              }
            }
          }
        );
        
        console.log('Using fresh client to fetch documents with timestamp:', timestamp);
        
        // Add delay to ensure database consistency after sync operations
        console.log('Waiting 2 seconds for database consistency...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data, error } = await freshClient
          .from('processed_documents')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        docs = data as ProcessedDocument[];
        console.log(`Fresh fetch returned ${docs.length} documents at timestamp ${timestamp}`);
        
        // Log status distribution for debugging
        const statusCounts = docs.reduce((acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('Fresh fetch status distribution:', statusCounts);
        
      } else {
        docs = await fetchProcessedDocuments();
        console.log(`Regular fetch returned ${docs.length} documents`);
      }
      
      console.log(`useDocumentSelection - Fetched ${docs.length} documents`);
      
      // Only show pending documents that are ready for processing
      const pendingDocs = docs.filter(doc => doc.status === 'pending');
      console.log(`useDocumentSelection - Filtered to ${pendingDocs.length} pending documents`);
      
      // Reset selections if document list changed significantly
      setDocuments(prevDocs => {
        const prevIds = new Set(prevDocs.map(d => d.id));
        const newIds = new Set(pendingDocs.map(d => d.id));
        const hasSignificantChange = prevDocs.length !== pendingDocs.length || 
          ![...prevIds].every(id => newIds.has(id));
        
        if (hasSignificantChange) {
          console.log('Document list changed significantly, resetting selections');
          setSelectedDocuments([]);
        }
        
        return pendingDocs;
      });
      
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
    console.log("useDocumentSelection - Manual refresh triggered", { 
      forceFresh, 
      lastRefreshTime,
      timeSinceLastRefresh: Date.now() - lastRefreshTime 
    });
    loadDocuments(forceFresh);
  };

  return {
    documents,
    selectedDocuments,
    isLoading,
    handleDocumentSelection,
    handleSelectAll,
    refreshDocuments,
    lastRefreshTime
  };
}
