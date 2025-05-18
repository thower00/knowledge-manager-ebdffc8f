
import { useState, useCallback, useRef } from "react";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments, deleteProcessedDocuments } from "../utils/documentDbService";
import { useToast } from "@/components/ui/use-toast";

export function useProcessedDocuments() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteAttemptRef = useRef(0); // To track delete attempts
  const { toast } = useToast();

  const loadProcessedDocuments = useCallback(async () => {
    console.log("Loading processed documents...");
    setIsLoading(true);
    try {
      const docs = await fetchProcessedDocuments();
      console.log("Fetched processed documents:", docs);
      setDocuments(docs);
      
      // Clear selection when documents are reloaded
      setSelectedDocuments([]);
    } catch (err: any) {
      console.error("Error fetching processed documents:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load processed documents."
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSelectAll = useCallback(() => {
    if (selectedDocuments.length === documents.length) {
      // If all are selected, deselect all
      setSelectedDocuments([]);
    } else {
      // Select all
      setSelectedDocuments(documents.map(doc => doc.id));
    }
  }, [documents, selectedDocuments]);

  const toggleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  }, []);

  const confirmDeleteSelected = useCallback(() => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to delete.",
      });
      return;
    }

    setIsDeleteDialogOpen(true);
  }, [selectedDocuments.length, toast]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedDocuments.length === 0) {
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    deleteAttemptRef.current += 1;
    const currentAttempt = deleteAttemptRef.current;
    
    try {
      const idsToDelete = [...selectedDocuments];
      console.log("Attempting to delete IDs:", idsToDelete);
      
      // Close dialog immediately for better UX
      setIsDeleteDialogOpen(false);
      
      // Keep track of current docs to restore if needed
      const previousDocs = [...documents];
      
      // Optimistically update UI first by removing the selected documents
      setDocuments(prev => prev.filter(doc => !idsToDelete.includes(doc.id)));
      
      // Clear selection
      setSelectedDocuments([]);
      
      // Perform the actual deletion
      const success = await deleteProcessedDocuments(idsToDelete);
      
      // If this isn't the most recent deletion attempt, ignore the result
      if (currentAttempt !== deleteAttemptRef.current) return;
      
      if (success) {
        toast({
          title: "Success",
          description: `Deleted ${idsToDelete.length} document(s).`,
        });
        
        // Ensure we have the latest data
        await loadProcessedDocuments();
      } else {
        // Show error and restore previous state
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete one or more documents. Please try again."
        });
        
        // Restore previous documents state
        setDocuments(previousDocs);
        
        // Reload to get accurate state
        await loadProcessedDocuments();
      }
    } catch (err: any) {
      // Only handle errors for the current attempt
      if (currentAttempt !== deleteAttemptRef.current) return;
      
      console.error("Error deleting documents:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete documents."
      });
      
      // Reload data to get accurate state
      await loadProcessedDocuments();
    } finally {
      if (currentAttempt === deleteAttemptRef.current) {
        setIsDeleting(false);
      }
    }
  }, [selectedDocuments, documents, toast, loadProcessedDocuments]);

  return {
    documents,
    isLoading,
    selectedDocuments,
    isDeleting,
    isDeleteDialogOpen,
    loadProcessedDocuments,
    handleSelectAll,
    toggleDocumentSelection,
    confirmDeleteSelected,
    handleDeleteSelected,
    setIsDeleteDialogOpen,
  };
}
