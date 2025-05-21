
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";

// Define the types for the extraction process interface
interface ExtractionProcess {
  isExtracting: boolean;
  setIsExtracting: (value: boolean) => void;
  extractionProgress: number;
  setExtractionProgress: (value: number) => void;
  extractionError: string | null;
  setExtractionError: (value: string | null) => void;
  extractionText: string;
  setExtractionText: (value: string) => void;
  extractFromDocument: (document: ProcessedDocument) => Promise<string>;
  createExtractionTimeout: (documentTitle: string) => number;
  clearExtractionTimeout: () => void;
}

interface UseExtractionHandlersProps {
  testUrl: string;
  testUrlValid: boolean;
  validateUrl: (url: string) => boolean;
  selectedDocumentIds: string[];
  extractAllDocuments: boolean;
  documentsToProcess: ProcessedDocument[];
  extractionProcess: ExtractionProcess;
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void;
}

export const useExtractionHandlers = ({
  testUrl,
  testUrlValid,
  validateUrl,
  selectedDocumentIds,
  extractAllDocuments,
  documentsToProcess,
  extractionProcess,
  onRunTest
}: UseExtractionHandlersProps) => {
  const { toast } = useToast();

  const {
    setIsExtracting,
    setExtractionProgress,
    setExtractionError,
    setExtractionText,
    extractFromDocument,
    createExtractionTimeout,
    clearExtractionTimeout
  } = extractionProcess;

  // Extract text from a URL
  const handleExtractFromUrl = useCallback(async () => {
    if (!testUrl || !validateUrl(testUrl)) {
      return;
    }
    
    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractionError(null);
    
    try {
      // Extract the document title from the URL for better user feedback
      const urlObj = new URL(testUrl);
      const fileName = urlObj.pathname.split('/').pop() || "document.pdf";
      
      setExtractionProgress(10);
      
      // Create a timeout for this extraction
      createExtractionTimeout(fileName);
      
      // Create a mock document object for the URL
      const urlDocument: ProcessedDocument = {
        id: 'url-document',
        title: fileName,
        url: testUrl,
        source_id: '',
        source_type: 'url',
        mime_type: 'application/pdf',
        status: 'completed',
        created_at: new Date().toISOString(),
        size: 0
      };
      
      // Use the extractFromDocument method from the extraction process
      const text = await extractFromDocument(urlDocument);
      
      // Clear timeout as extraction completed successfully
      clearExtractionTimeout();
      
      // Update the extraction text
      setExtractionText(text);
      
      // Complete the process
      setExtractionProgress(100);
      toast({
        title: "Extraction Completed",
        description: `Successfully extracted text from ${fileName}`,
      });
      
      // Call the onRunTest callback with the extracted text
      onRunTest({ extractionText: text, testUrl });
    } catch (error) {
      // Clear timeout as we have an error
      clearExtractionTimeout();
      
      console.error("Extraction error:", error);
      setExtractionError(error instanceof Error ? error.message : String(error));
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract text from document",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  }, [testUrl, validateUrl, extractFromDocument, setIsExtracting, setExtractionProgress, 
      setExtractionText, setExtractionError, createExtractionTimeout, clearExtractionTimeout, 
      toast, onRunTest]);

  // Extract text from selected database documents
  const handleExtractFromDatabase = useCallback(async () => {
    // If no documents selected or extract all not checked
    if (selectedDocumentIds.length === 0 && !extractAllDocuments) {
      toast({
        title: "No Selection",
        description: "Please select a document or check 'Extract from all documents'",
        variant: "destructive"
      });
      return;
    }
    
    if (documentsToProcess.length === 0) {
      toast({
        title: "No Documents",
        description: "There are no documents to extract from",
        variant: "destructive"
      });
      return;
    }
    
    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractionError(null);
    
    try {
      if (documentsToProcess.length === 1) {
        // Single document extraction
        const document = documentsToProcess[0];
        
        // Create a timeout for this document
        createExtractionTimeout(document.title);
        
        const text = await extractFromDocument(document);
        
        // Clear timeout as extraction completed successfully
        clearExtractionTimeout();
        
        setExtractionText(text);
        
        toast({
          title: "Extraction Completed",
          description: `Successfully extracted text from ${document.title}`,
        });
        
        onRunTest({ extractionText: text });
      } else {
        // Multiple documents extraction
        let allText = "";
        let successCount = 0;
        let failureCount = 0;
        
        for (let i = 0; i < documentsToProcess.length; i++) {
          const doc = documentsToProcess[i];
          extractionProcess.setCurrentDocumentIndex(i);
          
          try {
            // Create a timeout for this document
            createExtractionTimeout(doc.title);
            
            const text = await extractFromDocument(doc);
            
            // Clear timeout as extraction completed successfully
            clearExtractionTimeout();
            
            allText += `\n\n--- Document: ${doc.title} ---\n\n${text}`;
            successCount++;
          } catch (error) {
            // Clear timeout as we have an error
            clearExtractionTimeout();
            
            failureCount++;
            allText += `\n\n--- Document: ${doc.title} (FAILED) ---\n\nFailed to extract: ${error instanceof Error ? error.message : String(error)}`;
          }
          
          // Update overall progress
          setExtractionProgress(Math.floor(((i + 1) / documentsToProcess.length) * 100));
        }
        
        setExtractionText(allText);
        
        toast({
          title: "Batch Extraction Completed",
          description: `Successfully extracted ${successCount} documents, failed ${failureCount}`,
          variant: successCount > 0 ? "default" : "destructive"
        });
        
        onRunTest({ extractionText: allText });
      }
    } catch (error) {
      // Clear timeout as we have an error
      clearExtractionTimeout();
      
      console.error("Extraction error:", error);
      setExtractionError(error instanceof Error ? error.message : String(error));
      
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract text from document",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  }, [selectedDocumentIds, extractAllDocuments, documentsToProcess, extractFromDocument,
    setIsExtracting, setExtractionProgress, setExtractionText, setExtractionError,
    createExtractionTimeout, clearExtractionTimeout, extractionProcess, toast, onRunTest]);

  return {
    handleExtractFromUrl,
    handleExtractFromDatabase
  };
};
