
import { useState } from "react";
import { useDocumentSelection } from "./hooks/useDocumentSelection";
import { DatabaseDocumentSelector } from "./DatabaseDocumentSelector";
import { ProcessedDocument } from "@/types/document";
import { useToast } from "@/hooks/use-toast";
import { ExtractionProgress } from "./ExtractionProgress";
import { extractFileContent, convertToText } from "./services/fileContentExtraction";

interface DatabaseDocumentExtractorProps {
  onExtract: (text: string) => void;
  isExtracting: boolean;
}

export const DatabaseDocumentExtractor = ({
  onExtract,
  isExtracting
}: DatabaseDocumentExtractorProps) => {
  const { toast } = useToast();
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [currentlyExtracting, setCurrentlyExtracting] = useState(false);
  
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
  
  // Handle extraction from a single document
  const handleExtractDocument = async (document: ProcessedDocument) => {
    console.log(`Extracting content from document: ${document.title}`);
    setCurrentlyExtracting(true);
    setExtractionProgress(10);
    
    try {
      // Extract file content
      setExtractionProgress(30);
      const extractionResult = await extractFileContent(document);
      
      setExtractionProgress(70);
      
      if (!extractionResult.success) {
        throw new Error(extractionResult.error || "Failed to extract content");
      }
      
      // Convert to clean text
      setExtractionProgress(90);
      const cleanText = convertToText(extractionResult);
      
      setExtractionProgress(100);
      
      // Pass the extracted text to parent
      onExtract(cleanText);
      
      toast({
        title: "Extraction Complete",
        description: `Successfully extracted text from ${document.title}`,
      });
      
    } catch (error) {
      console.error("Error during document extraction:", error);
      setExtractionProgress(0);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown extraction error";
      
      toast({
        title: "Extraction Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Still call onExtract with error message so user can see what happened
      onExtract(`Extraction failed for "${document.title}": ${errorMessage}`);
    } finally {
      setCurrentlyExtracting(false);
      setExtractionProgress(0);
    }
  };
  
  // Handle extraction from database (first selected document)
  const handleExtractFromDatabase = () => {
    console.log("Extract from database initiated");
    
    if (documentsToProcess && documentsToProcess.length > 0) {
      handleExtractDocument(documentsToProcess[0]);
    } else {
      console.warn("No documents selected for extraction");
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to extract",
        variant: "destructive"
      });
    }
  };
  
  const isProcessing = isExtracting || currentlyExtracting;
  
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
        proxyConnected={true} // Not needed for file extraction
        refreshDocuments={refreshDocuments}
        disabled={isProcessing}
        currentDocumentIndex={0}
        documentsToProcess={documentsToProcess || []}
        handleExtractFromDatabase={handleExtractFromDatabase}
        isExtracting={isProcessing}
      />
      
      {/* Extraction progress indicator */}
      {(isProcessing || extractionProgress > 0) && (
        <ExtractionProgress 
          extractionProgress={extractionProgress} 
          isProgressiveMode={false}
        />
      )}
    </div>
  );
};
