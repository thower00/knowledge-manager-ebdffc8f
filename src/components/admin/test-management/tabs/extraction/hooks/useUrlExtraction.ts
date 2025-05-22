
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { sleep } from "@/lib/utils";

export const useUrlExtraction = (
  testUrl: string,
  testUrlValid: boolean,
  testUrlError: string | null,
  checkProxyConnection: () => Promise<boolean>,
  extractFromDocument: (doc: ProcessedDocument) => Promise<string>,
  setIsExtracting: (isExtracting: boolean) => void,
  setExtractionError: (error: string | null) => void,
  setProcessExtractionText: (text: string) => void,
  onComplete?: (extractedText: string, testUrl?: string) => void
) => {
  const [extractionText, setExtractionText] = useState("");
  const { toast } = useToast();
  
  // Extract text from URL
  const handleExtractFromUrl = useCallback(async () => {
    // Validate URL
    if (!testUrl) {
      toast({
        title: "No URL Provided",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }
    
    if (!testUrlValid) {
      toast({
        title: "Invalid URL",
        description: testUrlError || "The URL appears to be invalid",
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
      
      // Create a temporary document object with URL
      const tempDoc: ProcessedDocument = {
        id: "url-extract",
        title: "URL Document",
        url: testUrl,
        created_at: new Date().toISOString(),
        source_id: "url",
        source_type: "url",
        mime_type: "text/html",
        status: "pending"
      };
      
      // Extract text
      const extractedText = await extractFromDocument(tempDoc);
      
      // Update state with results
      setExtractionText(extractedText);
      setProcessExtractionText(extractedText);
      
      // Call complete callback if provided
      if (onComplete) {
        onComplete(extractedText, testUrl);
      }
      
      toast({
        title: "Extraction Complete",
        description: "Successfully extracted text from URL"
      });
    } catch (error) {
      console.error("Error in URL extraction:", error);
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
    testUrl, 
    testUrlValid, 
    testUrlError, 
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
    handleExtractFromUrl
  };
};
