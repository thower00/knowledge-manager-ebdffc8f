
import { useState } from "react";
import { useDocumentSelection } from "./hooks/useDocumentSelection";
import { DatabaseDocumentSelector } from "./DatabaseDocumentSelector";
import { Button } from "@/components/ui/button";
import { useExtractionHandlers } from "./hooks/useExtractionHandlers";
import { ProcessedDocument } from "@/types/document";
import { useToast } from "@/hooks/use-toast";

interface DatabaseDocumentExtractorProps {
  onExtract: (text: string) => void;
  isExtracting: boolean;
  proxyConnected: boolean | null;
}

export const DatabaseDocumentExtractor = ({
  onExtract,
  isExtracting,
  proxyConnected
}: DatabaseDocumentExtractorProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get document selection state
  const {
    selectedDocumentIds,
    dbDocuments,
    isLoadingDocuments,
    extractAllDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    setExtractAllDocuments,
    refreshDocuments
  } = useDocumentSelection();
  
  // Get handlers
  const { handleDirectExtraction } = useExtractionHandlers(text => {
    console.log("DatabaseDocumentExtractor received extraction result:", {
      length: text?.length || 0,
      sample: text?.substring(0, 100) || "no text"
    });
    
    // Pass the actual extracted text to the parent component
    if (text && typeof text === 'string') {
      onExtract(text);
    } else {
      console.error("Invalid extraction result:", text);
      toast({
        title: "Extraction Error",
        description: "Could not extract text from the document",
        variant: "destructive"
      });
    }
  });
  
  // Handle extraction start
  const handleExtractDocument = (document: ProcessedDocument) => {
    console.log(`Extracting text from document: ${document.title}`);
    setIsSubmitting(true);
    
    try {
      handleDirectExtraction(document);
    } catch (error) {
      console.error("Error during document extraction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">Extract from Database Documents</h3>
      
      <DatabaseDocumentSelector
        documents={dbDocuments || []}
        isLoading={isLoadingDocuments}
        selectedDocumentIds={selectedDocumentIds}
        extractAllDocuments={extractAllDocuments}
        toggleDocumentSelection={toggleDocumentSelection}
        toggleSelectAll={toggleSelectAll}
        setExtractAllDocuments={setExtractAllDocuments}
        onExtract={handleExtractDocument}
        proxyConnected={proxyConnected}
        refreshDocuments={refreshDocuments}
        disabled={isExtracting}
      />
    </div>
  );
};
