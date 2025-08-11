
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments } from "../../utils/documentDbService";
import { useToast } from "@/hooks/use-toast";

export function useChunkingDocuments() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Load documents when component mounts
  useEffect(() => {
    console.log("useChunkingDocuments - Initial mount");
    loadDocuments();
    
    // Mark component as initialized after loading
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
      console.log("useChunkingDocuments fully initialized");
    }, 1000);
    
    return () => clearTimeout(initTimer);
  }, []);

  // Ensure data is loaded when tab becomes visible
  useEffect(() => {
    if (isInitialized) {
      console.log("useChunkingDocuments is already initialized, ensuring data is loaded");
      if (documents.length === 0 && !isLoading) {
        console.log("No documents loaded yet, reloading...");
        loadDocuments();
      }
    }
  }, [isInitialized, documents.length, isLoading]);

  const loadDocuments = async () => {
    console.log("useChunkingDocuments - Loading documents");
    setIsLoading(true);
    try {
      const docs = await fetchProcessedDocuments();
      console.log(`useChunkingDocuments - Fetched ${docs.length} documents`);
      
      // Only show completed documents that can be chunked
      const completedDocs = docs.filter(doc => doc.status === 'completed');
      setDocuments(completedDocs);
    } catch (err) {
      console.error("Error loading documents for chunking:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load processed documents",
      });
    } finally {
      setIsLoading(false);
      console.log("useChunkingDocuments - Documents loading complete");
    }
  };

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

  return {
    documents,
    selectedDocuments,
    isLoading,
    isInitialized,
    handleDocumentSelection,
    handleSelectAll,
  };
}
