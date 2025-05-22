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

  // Define documentsToProcess as a memoized value - NOT a function
  const documentsToProcess = useMemo(() => {
    console.log("Computing documentsToProcess with:", {
      extractAll: extractAllDocuments,
      selectedIds: selectedDocumentIds,
      docsCount: dbDocuments.length
    });
    
    if (extractAllDocuments) {
      return dbDocuments;
    } else {
      // Filter the documents based on selected IDs
      return dbDocuments.filter(doc => selectedDocumentIds.includes(doc.id));
    }
  }, [dbDocuments, selectedDocumentIds, extractAllDocuments]);

  // Fetch documents from the database
  const fetchDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const documents = await fetchProcessedDocuments();
      console.log("Fetched documents:", documents);
      setDbDocuments(documents.filter(doc => doc.status === 'completed'));
      setIsLoadingDocuments(false);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch documents from the database",
        variant: "destructive"
      });
      setIsLoadingDocuments(false);
    }
  };

  const toggleDocumentSelection = (documentId: string) => {
    console.log("Toggling document selection:", documentId);
    setSelectedDocumentIds(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const toggleSelectAll = () => {
    console.log("Current selection:", selectedDocumentIds);
    console.log("All documents:", dbDocuments.map(d => d.id));
    
    // Fix: Check actual array lengths for equality check instead of direct comparison
    if (selectedDocumentIds.length === dbDocuments.length && dbDocuments.length > 0) {
      // Deselect all
      console.log("Deselecting all");
      setSelectedDocumentIds([]);
    } else {
      // Select all
      console.log("Selecting all");
      setSelectedDocumentIds(dbDocuments.map(doc => doc.id));
    }
  };

  // Modified to return a Promise explicitly and preserve the correct functionality
  const refreshDocuments = useCallback(async () => {
    await fetchDocuments();
    // Keep this to reset selection when refreshing
    setSelectedDocumentIds([]);
    return Promise.resolve();
  }, []);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

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
    documentsToProcess // Return the memoized value, not a function
  };
};
