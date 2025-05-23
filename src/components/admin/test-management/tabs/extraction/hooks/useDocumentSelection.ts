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
      selectedCount: selectedDocumentIds?.length || 0,
      docsCount: dbDocuments.length
    });
    
    // Return all documents when extractAllDocuments is true
    if (extractAllDocuments) {
      console.log("Extract all is enabled, returning all documents:", dbDocuments.length);
      return dbDocuments;
    }
    
    // Return only selected documents - ensure we handle empty selections properly
    if (!selectedDocumentIds || selectedDocumentIds.length === 0) {
      console.log("No documents selected, returning empty array");
      return [];
    }
    
    const selectedDocs = dbDocuments.filter(doc => selectedDocumentIds.includes(doc.id));
    console.log("Selected documents for extraction:", selectedDocs.length, "docs:", selectedDocs.map(d => d.title));
    return selectedDocs;
  }, [dbDocuments, selectedDocumentIds, extractAllDocuments]);

  // Fetch documents from the database
  const fetchDocuments = useCallback(async () => {
    console.log("Fetching processed documents from the database");
    setIsLoadingDocuments(true);
    try {
      const documents = await fetchProcessedDocuments();
      console.log("Fetched documents:", documents.length);
      // Only keep documents with 'completed' status
      const completedDocs = documents.filter(doc => doc.status === 'completed');
      console.log("Filtered completed documents:", completedDocs.length);
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
    console.log("toggleDocumentSelection called for:", documentId);
    
    setSelectedDocumentIds(prev => {
      // Ensure prev is an array to avoid TypeScript errors
      const currentIds = prev || []; 
      console.log("Current selection:", currentIds);
      
      // Check if document is already selected
      const isAlreadySelected = currentIds.includes(documentId);
      
      let newSelection: string[];
      if (isAlreadySelected) {
        // Remove the document from selection
        newSelection = currentIds.filter(id => id !== documentId);
        console.log("Removing document from selection, new selection:", newSelection);
      } else {
        // Add the document to selection
        newSelection = [...currentIds, documentId];
        console.log("Adding document to selection, new selection:", newSelection);
      }
      
      // Log the new selection state for debugging
      console.log(`Document ${documentId} ${isAlreadySelected ? 'removed from' : 'added to'} selection.`,
                  "New selection state:", newSelection);
      
      return newSelection;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    console.log("toggleSelectAll called with current state:", {
      selectedCount: selectedDocumentIds?.length || 0,
      totalDocs: dbDocuments.length
    });
    
    // Check if all documents are currently selected
    const allSelected = selectedDocumentIds?.length === dbDocuments.length && dbDocuments.length > 0;
    
    if (allSelected) {
      // Deselect all
      console.log("Deselecting all documents");
      setSelectedDocumentIds([]);
    } else {
      // Select all
      const allIds = dbDocuments.map(doc => doc.id);
      console.log("Selecting all documents:", allIds.length);
      setSelectedDocumentIds(allIds);
    }
  }, [selectedDocumentIds, dbDocuments]);

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

  // Debug log for selection state changes
  useEffect(() => {
    console.log("Selection state updated:", {
      selectedIds: selectedDocumentIds,
      selectedCount: selectedDocumentIds?.length || 0,
      documentsToProcess: documentsToProcess.length,
      extractAll: extractAllDocuments
    });
  }, [selectedDocumentIds, documentsToProcess, extractAllDocuments]);

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
    documentsToProcess,
    setSelectedDocumentIds
  };
};
