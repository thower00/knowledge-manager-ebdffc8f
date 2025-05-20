
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSelection } from "./useDocumentSelection";
import { useUrlValidation } from "./useUrlValidation";
import { useExtractionProcess } from "./useExtractionProcess";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";
import { extractPdfText } from "@/components/admin/document-extraction/utils/pdfUtils";

interface UseDocumentExtractionProps {
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void;
}

export const useDocumentExtraction = ({ onRunTest }: UseDocumentExtractionProps) => {
  const { 
    dbDocuments, 
    selectedDocumentIds, 
    isLoadingDocuments, 
    extractAllDocuments, 
    setExtractAllDocuments,
    toggleDocumentSelection, 
    toggleSelectAll, 
    refreshDocuments, 
    fetchDocuments,
    documentsToProcess
  } = useDocumentSelection();

  const {
    testUrl,
    setTestUrl,
    testUrlError,
    testUrlValid,
    validateUrl
  } = useUrlValidation();

  const {
    isExtracting,
    setIsExtracting,
    extractionText,
    setExtractionText,
    extractionProgress,
    setExtractionProgress,
    extractionError,
    setExtractionError,
    proxyConnected,
    setProxyConnected,
    currentDocumentIndex,
    setCurrentDocumentIndex,
    checkProxyConnection,
    extractFromDocument
  } = useExtractionProcess();

  const { toast } = useToast();

  // Check proxy connection on mount
  useEffect(() => {
    checkProxyConnection();
    fetchDocuments();
  }, []);

  // Extract text from a URL
  const handleExtractFromUrl = async () => {
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
      
      // Fetch the document via proxy
      const documentData = await fetchDocumentViaProxy(testUrl, fileName);
      setExtractionProgress(40);
      
      // Extract text from the document
      const text = await extractPdfText(documentData, (progress) => {
        // Map the progress from the PDF extraction
        const overallProgress = 40 + Math.floor((progress / 100) * 55);
        setExtractionProgress(overallProgress);
      });
      
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
  };

  // Extract text from selected database documents
  const handleExtractFromDatabase = async () => {
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
    setCurrentDocumentIndex(0);
    
    try {
      if (documentsToProcess.length === 1) {
        // Single document extraction
        const document = documentsToProcess[0];
        const text = await extractFromDocument(document);
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
          setCurrentDocumentIndex(i);
          
          try {
            const text = await extractFromDocument(doc);
            allText += `\n\n--- Document: ${doc.title} ---\n\n${text}`;
            successCount++;
          } catch (error) {
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
  };

  return {
    extractionText,
    setExtractionText,
    testUrl,
    setTestUrl,
    testUrlError,
    testUrlValid,
    isExtracting,
    extractionProgress,
    extractionError,
    proxyConnected,
    handleExtractFromUrl,
    handleExtractFromDatabase,
    selectedDocumentIds,
    dbDocuments,
    isLoadingDocuments,
    extractAllDocuments,
    setExtractAllDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    refreshDocuments,
    currentDocumentIndex,
    documentsToProcess,
  };
};
