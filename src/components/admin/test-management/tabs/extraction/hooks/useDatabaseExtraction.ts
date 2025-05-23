
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { sleep } from "@/lib/utils";

export const useDatabaseExtraction = (
  selectedDocumentIds: string[],
  extractAllDocuments: boolean,
  dbDocuments: ProcessedDocument[] | undefined,
  documentsToProcess: ProcessedDocument[],
  checkProxyConnection: () => Promise<boolean>,
  extractFromDocument: (doc: ProcessedDocument) => Promise<string>,
  setIsExtracting: (isExtracting: boolean) => void,
  setExtractionError: (error: string | null) => void,
  setProcessExtractionText: (text: string) => void,
  onComplete?: (extractedText: string) => void
) => {
  const [extractionText, setExtractionText] = useState("");
  const { toast } = useToast();
  
  // Extract text from database documents
  const handleExtractFromDatabase = useCallback(async () => {
    // Log extraction state for debugging
    console.log("useDatabaseExtraction handleExtractFromDatabase called with state:", {
      selectedDocumentIds,
      selectedCount: selectedDocumentIds?.length || 0,
      extractAllDocuments,
      dbDocumentsCount: dbDocuments?.length || 0,
      documentsToProcessLength: documentsToProcess?.length || 0
    });
    
    // Safety checks
    if (!dbDocuments || dbDocuments.length === 0) {
      console.error("No documents available");
      toast({
        title: "No Documents Available",
        description: "There are no documents in the database",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure we have documents to process - either through selection or "extract all"
    let docsToProcess: ProcessedDocument[] = [];
    
    if (extractAllDocuments) {
      console.log("Extract all is enabled, using all documents");
      docsToProcess = dbDocuments;
    } else if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      console.log("Using selected documents:", selectedDocumentIds);
      docsToProcess = dbDocuments.filter(doc => selectedDocumentIds.includes(doc.id));
      console.log("Filtered documents for processing:", docsToProcess.map(d => d.title));
    } else {
      console.error("No documents selected for processing");
      setExtractionError("No documents selected. Please select at least one document or enable 'Extract All'.");
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document or enable 'Extract All'",
        variant: "destructive"
      });
      return;
    }
    
    if (docsToProcess.length === 0) {
      console.error("No documents match the selection criteria");
      setExtractionError("No documents match the selection criteria.");
      toast({
        title: "No Documents Available",
        description: "No documents match the selection criteria",
        variant: "destructive"
      });
      return;
    }
    
    // Start extraction process
    setIsExtracting(true);
    setExtractionError(null);
    
    try {
      // Check proxy connection first
      const isConnected = await checkProxyConnection();
      if (!isConnected) {
        setIsExtracting(false);
        setExtractionError("Could not connect to the document proxy service.");
        toast({
          title: "Connection Failed",
          description: "Could not connect to the document proxy service",
          variant: "destructive"
        });
        return;
      }
      
      // Select the first document to process (we'll handle multiple documents later if needed)
      const doc = docsToProcess[0];
      console.log("Processing document:", doc.title, "with ID:", doc.id);
      
      try {
        // Extract text from the document
        const extractedText = await extractFromDocument(doc);
        console.log("Extraction completed successfully, text length:", extractedText.length);
        
        // Update state with results
        setExtractionText(extractedText);
        setProcessExtractionText(extractedText);
        
        // Wait briefly before completing to ensure UI updates
        await sleep(100);
        
        // Call complete callback if provided
        if (onComplete) {
          onComplete(extractedText);
        }
        
        toast({
          title: "Extraction Complete",
          description: `Successfully extracted text from "${doc.title}"`
        });
      } catch (docError) {
        console.error(`Error extracting from document ${doc.title}:`, docError);
        
        // Set extraction error
        setExtractionError(docError instanceof Error ? docError.message : "Error extracting from document");
        
        toast({
          title: "Extraction Failed",
          description: docError instanceof Error ? docError.message : "Unknown error during extraction",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in database extraction:", error);
      setExtractionError(error instanceof Error ? error.message : "Unknown error during extraction");
      
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Unknown error during extraction",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  }, [
    selectedDocumentIds,
    extractAllDocuments,
    dbDocuments,
    documentsToProcess,
    checkProxyConnection,
    extractFromDocument,
    onComplete,
    toast,
    setIsExtracting,
    setExtractionError,
    setProcessExtractionText
  ]);

  return {
    extractionText,
    setExtractionText,
    handleExtractFromDatabase
  };
};
