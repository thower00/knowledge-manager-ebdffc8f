
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments } from "../../utils/documentDbService";
import { useToast } from "@/components/ui/use-toast";

export function useDocumentSelection() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadDocuments = async () => {
    console.log("useDocumentSelection - Loading documents");
    setIsLoading(true);
    try {
      const docs = await fetchProcessedDocuments();
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

  const refreshDocuments = () => {
    loadDocuments();
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
