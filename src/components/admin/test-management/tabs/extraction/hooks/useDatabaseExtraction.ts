
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
    // Log selection state to help debugging
    console.log("Selected document IDs:", selectedDocumentIds);
    console.log("Extract All Documents flag:", extractAllDocuments);
    console.log("Available documents:", dbDocuments?.length || 0);
    console.log("Documents to process:", documentsToProcess?.length || 0);
    
    // Validate selected documents
    if (!extractAllDocuments && selectedDocumentIds.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document or enable 'Extract All'",
        variant: "destructive"
      });
      return;
    }
    
    if (!dbDocuments || dbDocuments.length === 0) {
      toast({
        title: "No Documents Available",
        description: "There are no documents in the database",
        variant: "destructive"
      });
      return;
    }
    
    // Explicitly check if documentsToProcess is empty
    if (documentsToProcess.length === 0) {
      toast({
        title: "No Documents to Process",
        description: "No valid documents were selected for processing",
        variant: "destructive"
      });
      return;
    }
    
    // Check connection first
    setIsExtracting(true);
    
    try {
      // Make sure we have a connection to the proxy
      const isConnected = await checkProxyConnection();
      if (!isConnected) {
        setIsExtracting(false);
        toast({
          title: "Connection Failed",
          description: "Could not connect to the document proxy service",
          variant: "destructive"
        });
        return;
      }
      
      // Determine which documents to process
      const docsToProcess = documentsToProcess;
      console.log("Final documents to process:", docsToProcess);
      
      let combinedText = "";
      let processedCount = 0;
      
      // We'll only process the first document for simplicity
      const doc = docsToProcess[0];
      
      try {
        // Extract text from this document
        const extractedText = await extractFromDocument(doc);
        
        // Add header for this document
        combinedText = `Document: ${doc.title}\n\n${extractedText}`;
        processedCount++;
        
        // Update state with results
        setExtractionText(combinedText);
        setProcessExtractionText(combinedText);
        
        // Wait a moment before marking as complete to ensure UI updates
        await sleep(100);
        
        // Call complete callback if provided
        if (onComplete) {
          onComplete(combinedText);
        }
      } catch (docError) {
        console.error(`Error extracting from document ${doc.title}:`, docError);
        
        // Continue with next document, add error note to combined text
        combinedText += `\n\nError extracting from ${doc.title}: ${docError instanceof Error ? docError.message : "Unknown error"}`;
        
        // Set extraction error
        setExtractionError(docError instanceof Error ? docError.message : "Error extracting from document");
      }
      
      if (processedCount === 0) {
        toast({
          title: "Extraction Failed",
          description: "Could not extract text from any of the selected documents",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Extraction Complete",
          description: `Successfully extracted text from ${processedCount} document(s)`
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
