
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Info, CheckCircle, ExternalLink, Loader2, FileText, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validatePdfUrl, convertGoogleDriveUrl } from "@/components/admin/document-extraction/utils/urlUtils";
import { extractPdfText } from "@/components/admin/document-extraction/utils/pdfUtils";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments } from "@/components/content/utils/documentDbService";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  const [extractionText, setExtractionText] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [testUrlError, setTestUrlError] = useState<string | null>(null);
  const [testUrlValid, setTestUrlValid] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [proxyConnected, setProxyConnected] = useState<boolean | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(true);
  const { toast } = useToast();
  
  // Database document selection
  const [dbDocuments, setDbDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [extractAllDocuments, setExtractAllDocuments] = useState(false);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  
  // Define documentsToProcess - this fixes the error
  const documentsToProcess = extractAllDocuments 
    ? dbDocuments 
    : dbDocuments.filter(doc => selectedDocumentIds.includes(doc.id));

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
      setShowExtractedText(true);
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
    
    // Use the defined documentsToProcess variable here
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
        setShowExtractedText(true);
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
        setShowExtractedText(true);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Document Extraction</CardTitle>
        <CardDescription>
          Verify document text extraction functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Database Document List */}
        <div className="space-y-2 p-4 border rounded-md bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-medium">Extract from Database Documents</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshDocuments}
              disabled={isLoadingDocuments}
            >
              {isLoadingDocuments ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                "Refresh Documents"
              )}
            </Button>
          </div>
          
          {/* Document List with checkboxes */}
          <div className="space-y-2">
            {isLoadingDocuments ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dbDocuments.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="select-all" 
                      checked={selectedDocumentIds.length === dbDocuments.length && dbDocuments.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label htmlFor="select-all" className="cursor-pointer">Select All Documents</Label>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedDocumentIds.length} of {dbDocuments.length} selected
                  </span>
                </div>
                
                <div className="max-h-60 overflow-auto border rounded-md">
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-1">
                      {dbDocuments.map((doc) => (
                        <div 
                          key={doc.id} 
                          className={`flex items-center space-x-2 p-2 rounded-md ${
                            selectedDocumentIds.includes(doc.id) ? 'bg-blue-50' : 'hover:bg-gray-100'
                          }`}
                        >
                          <Checkbox 
                            id={`doc-${doc.id}`} 
                            checked={selectedDocumentIds.includes(doc.id)}
                            onCheckedChange={() => toggleDocumentSelection(doc.id)}
                          />
                          <div className="flex-grow">
                            <Label htmlFor={`doc-${doc.id}`} className="cursor-pointer">{doc.title}</Label>
                            <div className="flex gap-2 items-center mt-1">
                              <Badge variant="outline" className="text-xs font-normal">
                                {doc.mime_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center border rounded-md bg-gray-100">
                <p className="text-muted-foreground">No documents available in the database</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload documents in the Documents tab first
                </p>
              </div>
            )}
            
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox 
                id="extract-all" 
                checked={extractAllDocuments}
                onCheckedChange={(checked) => {
                  setExtractAllDocuments(checked === true);
                  if (checked) {
                    setSelectedDocumentIds([]);
                  }
                }}
              />
              <Label htmlFor="extract-all">Extract from all documents (ignores selection)</Label>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleExtractFromDatabase} 
              disabled={(selectedDocumentIds.length === 0 && !extractAllDocuments) || isExtracting || dbDocuments.length === 0}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {documentsToProcess?.length > 1 
                    ? `Extracting Document ${currentDocumentIndex + 1}/${documentsToProcess.length}...` 
                    : "Extracting..."}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {extractAllDocuments 
                    ? `Extract from All Documents (${dbDocuments.length})` 
                    : `Extract from Selected Documents (${selectedDocumentIds.length})`}
                </>
              )}
            </Button>
          </div>
          
          {/* Connection status indicator */}
          <div className="mt-4 flex items-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${
              proxyConnected === true ? 'bg-green-500' : 
              proxyConnected === false ? 'bg-red-500' : 
              'bg-yellow-500 animate-pulse'
            }`}></span>
            <span className="text-sm text-muted-foreground">
              Proxy Service: {
                proxyConnected === true ? 'Available' : 
                proxyConnected === false ? 'Unavailable' : 
                'Checking...'
              }
            </span>
          </div>
        </div>

        {/* URL Input (keeping this as an alternative option) */}
        <div className="grid gap-2">
          <Label>Or enter PDF URL for extraction test</Label>
          <Input
            type="url"
            value={testUrl}
            onChange={(e) => {
              setTestUrl(e.target.value);
              if (e.target.value.length > 5) {
                validateUrl(e.target.value);
              } else {
                setTestUrlValid(false);
                setTestUrlError(null);
              }
            }}
            placeholder="https://example.com/sample.pdf"
            className={testUrlValid ? "border-green-400 focus-visible:ring-green-400" : ""}
          />
          
          {testUrlValid && (
            <Alert variant="default" className="bg-green-50 border-green-300 text-green-800 mt-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2">URL appears to be a valid PDF link</AlertDescription>
            </Alert>
          )}
          
          {testUrlError && (
            <Alert variant="warning" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">{testUrlError}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleExtractFromUrl} 
            disabled={!testUrlValid || isExtracting}
            variant="outline"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting from URL...
              </>
            ) : (
              "Extract from URL"
            )}
          </Button>
        </div>

        {/* Manual Text Input Option */}
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Or paste document text for extraction test</Label>
            <Textarea
              value={extractionText}
              onChange={(e) => setExtractionText(e.target.value)}
              placeholder="Paste document content to test extraction..."
              rows={5}
            />
          </div>
        </div>

        {/* Extraction Progress Bar */}
        {isExtracting && (
          <div className="mt-2 space-y-2">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-in-out" 
                style={{ width: `${extractionProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {extractionProgress}% complete
            </p>
          </div>
        )}
        
        {/* Error Display */}
        {extractionError && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">{extractionError}</AlertDescription>
          </Alert>
        )}
        
        {/* Troubleshooting Panel */}
        <div className="mt-2 p-3 border border-amber-300 bg-amber-50 text-amber-800 rounded-md">
          <p className="font-medium flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            PDF Worker Troubleshooting:
          </p>
          <ul className="list-disc ml-5 mt-1 text-sm">
            <li>If extraction fails with worker errors, try using a different browser or network</li>
            <li>Some corporate networks block worker script downloads from CDNs</li>
            <li>The system will attempt multiple CDN sources and a local fallback</li>
            <li>
              <a 
                href="https://mozilla.github.io/pdf.js/getting_started/" 
                className="text-amber-600 hover:text-amber-800 flex items-center" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Learn more about PDF.js workers
              </a>
            </li>
          </ul>
        </div>

        {/* Test Run Button */}
        <Button 
          onClick={() => {
            if (extractionText) {
              onRunTest({ extractionText });
              toast({
                title: "Test Complete",
                description: "Extraction test completed with provided text",
              });
            } else {
              toast({
                title: "No Text Available",
                description: "Please extract text first or paste it manually",
                variant: "destructive"
              });
            }
          }}
          disabled={!extractionText || isLoading || isExtracting}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Test...
            </>
          ) : (
            "Run Extraction Test"
          )}
        </Button>
        
        {/* Preview of extracted text */}
        {extractionText && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium">Extracted Text Preview</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowExtractedText(!showExtractedText)}
                className="h-8 px-2"
              >
                {showExtractedText ? (
                  <>
                    <X className="h-4 w-4 mr-1" /> Hide
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-1" /> Show
                  </>
                )}
              </Button>
            </div>
            
            {showExtractedText && (
              <ScrollArea className="h-96">
                <pre className="whitespace-pre-wrap font-mono text-sm p-3 border rounded bg-white">
                  {extractionText}
                </pre>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
