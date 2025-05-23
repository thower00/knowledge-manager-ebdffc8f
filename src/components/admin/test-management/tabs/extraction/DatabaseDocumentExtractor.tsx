
import { useState } from "react";
import { useDocumentSelection } from "./hooks/useDocumentSelection";
import { DatabaseDocumentSelector } from "./DatabaseDocumentSelector";
import { Button } from "@/components/ui/button";
import { useExtractionHandlers } from "./hooks/useExtractionHandlers";
import { ProcessedDocument } from "@/types/document";
import { useToast } from "@/hooks/use-toast";
import { ExtractionProgress } from "./ExtractionProgress"; // Import the ExtractionProgress component

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
  const [extractionProgress, setExtractionProgress] = useState(0); // Add state for progress
  
  // Get document selection state
  const {
    selectedDocumentIds,
    dbDocuments,
    isLoadingDocuments,
    extractAllDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    setExtractAllDocuments,
    refreshDocuments,
    documentsToProcess
  } = useDocumentSelection();
  
  // Get handlers
  const { handleDirectExtraction } = useExtractionHandlers(text => {
    console.log("DatabaseDocumentExtractor received extraction result:", {
      length: text?.length || 0,
      sample: text?.substring(0, 100) || "no text"
    });
    
    // Set extraction to complete
    setExtractionProgress(100);
    
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
    setExtractionProgress(10); // Start progress
    
    try {
      handleDirectExtraction(document);
      // Progress updates will happen in the extraction process
      setExtractionProgress(30); // Update progress after extraction starts
    } catch (error) {
      console.error("Error during document extraction:", error);
      setExtractionProgress(0); // Reset progress on error
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // This function will be passed as the handleExtractFromDatabase prop
  const handleExtractFromDatabase = () => {
    console.log("Extract from database initiated");
    setExtractionProgress(10); // Start progress
    
    // If there's a selected document, extract from the first one
    if (documentsToProcess && documentsToProcess.length > 0) {
      handleExtractDocument(documentsToProcess[0]);
    } else {
      console.warn("No documents selected for extraction");
      setExtractionProgress(0); // Reset progress
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to extract",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium">Extract from Database Documents</h3>
      
      <DatabaseDocumentSelector
        dbDocuments={dbDocuments || []}
        isLoadingDocuments={isLoadingDocuments}
        selectedDocumentIds={selectedDocumentIds}
        extractAllDocuments={extractAllDocuments}
        toggleDocumentSelection={toggleDocumentSelection}
        toggleSelectAll={toggleSelectAll}
        setExtractAllDocuments={setExtractAllDocuments}
        onExtract={handleExtractDocument}
        proxyConnected={proxyConnected}
        refreshDocuments={refreshDocuments}
        disabled={isExtracting}
        currentDocumentIndex={0}
        documentsToProcess={documentsToProcess || []}
        handleExtractFromDatabase={handleExtractFromDatabase}
        isExtracting={isExtracting}
      />
      
      {/* Add extraction progress indicator */}
      {(isExtracting || extractionProgress > 0) && (
        <ExtractionProgress 
          extractionProgress={extractionProgress} 
          isProgressiveMode={false}
        />
      )}
    </div>
  );
};
