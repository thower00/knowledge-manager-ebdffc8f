
import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchProcessedDocuments } from "@/components/content/utils/documentDbService";
import { ProcessedDocument } from "@/types/document";
import { useToast } from "@/hooks/use-toast";

export const useDocumentSelection = () => {
  const [dbDocuments, setDbDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [extractAllDocuments, setExtractAllDocuments] = useState(false);
  const { toast } = useToast();

  // Define documentsToProcess as a memoized value based on selection state
  const documentsToProcess = useMemo(() => {
    console.log("Computing documentsToProcess with:", {
      extractAll: extractAllDocuments,
      selectedIds: selectedDocumentIds,
      docsCount: dbDocuments.length
    });
    
    // Return all documents when extractAllDocuments is true
    if (extractAllDocuments) {
      return dbDocuments;
    }
    
    // Return only selected documents
    return dbDocuments.filter(doc => selectedDocumentIds.includes(doc.id));
  }, [dbDocuments, selectedDocumentIds, extractAllDocuments]);

  // Fetch documents from the database
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    try {
      const documents = await fetchProcessedDocuments();
      console.log("Fetched documents:", documents);
      // Only keep documents with 'completed' status
      const completedDocs = documents.filter(doc => doc.status === 'completed');
      console.log("Filtered completed documents:", completedDocs);
      setDbDocuments(completedDocs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch documents from the database",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [toast]);

  const toggleDocumentSelection = useCallback((documentId: string) => {
    console.log("Toggling document selection:", documentId);
    setSelectedDocumentIds(prev => {
      if (prev.includes(documentId)) {
        const newSelection = prev.filter(id => id !== documentId);
        console.log("Document removed from selection, new selection:", newSelection);
        return newSelection;
      } else {
        const newSelection = [...prev, documentId];
        console.log("Document added to selection, new selection:", newSelection);
        return newSelection;
      }
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    console.log("toggleSelectAll called with current state:", {
      selectedCount: selectedDocumentIds.length,
      totalDocs: dbDocuments.length
    });
    
    if (selectedDocumentIds.length === dbDocuments.length && dbDocuments.length > 0) {
      // Deselect all
      console.log("Deselecting all documents");
      setSelectedDocumentIds([]);
    } else {
      // Select all
      const allIds = dbDocuments.map(doc => doc.id);
      console.log("Selecting all documents:", allIds);
      setSelectedDocumentIds(allIds);
    }
  }, [selectedDocumentIds.length, dbDocuments]);

  // Return a Promise explicitly for refresh
  const refreshDocuments = useCallback(async () => {
    console.log("Refreshing documents...");
    await fetchDocuments();
    // Reset selection when refreshing
    setSelectedDocumentIds([]);
    return Promise.resolve();
  }, [fetchDocuments]);

  // Fetch documents on component mount
  useEffect(() => {
    console.log("useDocumentSelection hook mounted, fetching documents");
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    dbDocuments,
    selectedDocumentIds,
    isLoadingDocuments,
    extractAllDocuments,
    setExtractAllDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    refreshDocuments,
    fetchDocuments,
    documentsToProcess
  };
};
