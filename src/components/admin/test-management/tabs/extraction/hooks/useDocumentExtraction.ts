
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { validatePdfUrl, convertGoogleDriveUrl } from "@/components/admin/document-extraction/utils/urlUtils";
import { extractPdfText } from "@/components/admin/document-extraction/utils/pdfUtils";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";
import { fetchProcessedDocuments } from "@/components/content/utils/documentDbService";

interface UseDocumentExtractionProps {
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void;
}

export const useDocumentExtraction = ({ onRunTest }: UseDocumentExtractionProps) => {
  const [extractionText, setExtractionText] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [testUrlError, setTestUrlError] = useState<string | null>(null);
  const [testUrlValid, setTestUrlValid] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [proxyConnected, setProxyConnected] = useState<boolean | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  // Database document selection
  const [dbDocuments, setDbDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [extractAllDocuments, setExtractAllDocuments] = useState(false);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  
  // Define documentsToProcess
  const documentsToProcess = extractAllDocuments 
    ? dbDocuments 
    : dbDocuments.filter(doc => selectedDocumentIds.includes(doc.id));
    
  const { toast } = useToast();

  // Fetch documents from the database
  const fetchDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const documents = await fetchProcessedDocuments();
      setDbDocuments(documents.filter(doc => doc.status === 'completed'));
      setIsLoadingDocuments(false);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch documents from the database",
        variant: "destructive"
      });
      setIsLoadingDocuments(false);
    }
  };

  // Check proxy connection on mount
  useEffect(() => {
    const checkProxyConnection = async () => {
      try {
        await fetchDocumentViaProxy("", "connection_test", 0);
        setProxyConnected(true);
      } catch (error) {
        console.error("Proxy connection failed:", error);
        setProxyConnected(false);
      }
    };
    
    checkProxyConnection();
    fetchDocuments();
  }, []);

  // Validate URL when it changes
  useEffect(() => {
    if (testUrl) {
      validateUrl(testUrl);
    }
  }, [testUrl]);

  const validateUrl = (url: string) => {
    // Reset error and valid states first
    setTestUrlError(null);
    setTestUrlValid(false);
    
    if (!url) return true;
    
    // Use our validation utility
    const { isValid, message } = validatePdfUrl(url);
    
    if (!isValid && message) {
      setTestUrlError(message);
      return false;
    }
    
    // URL is valid
    setTestUrlValid(true);
    
    // Check if we can convert Google Drive URL to a better format
    const { url: convertedUrl, wasConverted } = convertGoogleDriveUrl(url);
    if (wasConverted) {
      setTestUrl(convertedUrl);
      toast({
        title: "URL Improved",
        description: "The Google Drive URL has been converted to direct download format.",
        variant: "default"
      });
    }
    
    return true;
  };

  const extractFromDocument = async (document: ProcessedDocument) => {
    if (!document || !document.url) {
      toast({
        title: "Error",
        description: "Selected document has no URL",
        variant: "destructive"
      });
      return "";
    }

    try {
      // Set initial progress
      setExtractionProgress(10);
      
      // Fetch the document via proxy
      console.log(`Starting extraction for document: ${document.title} (${document.url})`);
      const documentData = await fetchDocumentViaProxy(document.url, document.title);
      
      // Update progress after fetch completes
      setExtractionProgress(40);
      
      // Extract text from the document
      const text = await extractPdfText(documentData, (progress) => {
        // Map the progress to our overall progress (40-95)
        const overallProgress = 40 + Math.floor((progress / 100) * 55);
        setExtractionProgress(overallProgress);
      });
      
      // Complete the extraction
      setExtractionProgress(100);
      return text;
    } catch (error) {
      console.error(`Error extracting from document ${document.title}:`, error);
      throw error;
    }
  };

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

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocumentIds.length === dbDocuments.length) {
      // Deselect all
      setSelectedDocumentIds([]);
    } else {
      // Select all
      setSelectedDocumentIds(dbDocuments.map(doc => doc.id));
    }
  };

  const refreshDocuments = () => {
    fetchDocuments();
    setSelectedDocumentIds([]);
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
