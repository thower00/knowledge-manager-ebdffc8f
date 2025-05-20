
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
import { AlertTriangle, Info, CheckCircle, ExternalLink, Loader2, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validatePdfUrl, convertGoogleDriveUrl } from "@/components/admin/document-extraction/utils/urlUtils";
import { extractPdfText } from "@/components/admin/document-extraction/utils/pdfUtils";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments } from "@/components/content/utils/documentDbService";
import { Checkbox } from "@/components/ui/checkbox";

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
  const { toast } = useToast();
  
  // Database document selection
  const [dbDocuments, setDbDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [extractAllDocuments, setExtractAllDocuments] = useState(false);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);

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

  // Update selected document when ID changes
  useEffect(() => {
    if (selectedDocumentId && dbDocuments.length > 0) {
      const doc = dbDocuments.find(d => d.id === selectedDocumentId);
      setSelectedDocument(doc || null);
    } else {
      setSelectedDocument(null);
    }
  }, [selectedDocumentId, dbDocuments]);

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

  const extractFromSelectedDocument = async (document: ProcessedDocument) => {
    if (!document || !document.url) {
      toast({
        title: "Error",
        description: "Selected document has no URL",
        variant: "destructive"
      });
      return "";
    }

    setExtractionProgress(10);
    
    try {
      // Fetch the document via proxy
      const documentData = await fetchDocumentViaProxy(document.url, document.title);
      setExtractionProgress(30);
      
      // Extract text from the document
      const text = await extractPdfText(documentData, (progress) => {
        // Map the progress to our overall progress (40-90)
        const overallProgress = 30 + Math.floor((progress / 100) * 65);
        setExtractionProgress(overallProgress);
      });
      
      setExtractionProgress(95);
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
        // Map the progress from the PDF extraction (which goes from 5-95)
        // to our overall progress (40-90)
        const overallProgress = 40 + Math.floor((progress - 5) * 0.5);
        setExtractionProgress(overallProgress);
      });
      
      setExtractionProgress(95);
      
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
    if (extractAllDocuments) {
      if (dbDocuments.length === 0) {
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
      
      // Extract from all documents one by one
      let allText = "";
      let successCount = 0;
      let failureCount = 0;
      
      for (let i = 0; i < dbDocuments.length; i++) {
        const doc = dbDocuments[i];
        setCurrentDocumentIndex(i);
        
        try {
          const text = await extractFromSelectedDocument(doc);
          allText += `\n\n--- Document: ${doc.title} ---\n\n${text}`;
          successCount++;
        } catch (error) {
          failureCount++;
          allText += `\n\n--- Document: ${doc.title} (FAILED) ---\n\nFailed to extract: ${error instanceof Error ? error.message : String(error)}`;
        }
        
        // Update overall progress
        setExtractionProgress(Math.floor(((i + 1) / dbDocuments.length) * 100));
      }
      
      setExtractionText(allText);
      
      toast({
        title: "Batch Extraction Completed",
        description: `Successfully extracted ${successCount} documents, failed ${failureCount}`,
        variant: successCount > 0 ? "default" : "destructive"
      });
      
      onRunTest({ extractionText: allText });
      setIsExtracting(false);
      
    } else {
      // Extract from single selected document
      if (!selectedDocument) {
        toast({
          title: "No Document Selected",
          description: "Please select a document to extract from",
          variant: "destructive"
        });
        return;
      }
      
      setIsExtracting(true);
      setExtractionProgress(0);
      setExtractionError(null);
      
      try {
        const text = await extractFromSelectedDocument(selectedDocument);
        
        setExtractionText(text);
        setExtractionProgress(100);
        
        toast({
          title: "Extraction Completed",
          description: `Successfully extracted text from ${selectedDocument.title}`,
        });
        
        onRunTest({ extractionText: text });
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
    }
  };

  const handleTest = () => {
    if (testUrl) {
      handleExtractFromUrl();
    } else if (selectedDocumentId || extractAllDocuments) {
      handleExtractFromDatabase();
    } else if (extractionText) {
      onRunTest({ extractionText });
      toast({
        title: "Test completed",
        description: "Extraction test completed with provided text",
      });
    } else {
      toast({
        title: "No input",
        description: "Please provide either a URL, select a document, or enter text to extract",
        variant: "destructive"
      });
    }
  };

  const refreshDocuments = () => {
    fetchDocuments();
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
        {/* Database Document Selection */}
        <div className="space-y-2 p-4 border rounded-md bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-medium">Extract from Database Document</h3>
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
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox 
                id="extract-all" 
                checked={extractAllDocuments}
                onCheckedChange={(checked) => {
                  setExtractAllDocuments(checked === true);
                  if (checked) {
                    setSelectedDocumentId("");
                    setSelectedDocument(null);
                  }
                }}
              />
              <Label htmlFor="extract-all">Extract from all documents</Label>
            </div>
            
            {!extractAllDocuments && (
              <Select 
                value={selectedDocumentId} 
                onValueChange={setSelectedDocumentId}
                disabled={isLoadingDocuments || extractAllDocuments}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDocuments ? (
                    <SelectItem value="loading" disabled>
                      Loading documents...
                    </SelectItem>
                  ) : dbDocuments.length > 0 ? (
                    dbDocuments.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-docs" disabled>
                      No documents available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            
            <Button 
              className="w-full" 
              onClick={() => handleExtractFromDatabase()} 
              disabled={(!selectedDocumentId && !extractAllDocuments) || isExtracting}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {extractAllDocuments 
                    ? `Extracting Document ${currentDocumentIndex + 1}/${dbDocuments.length}...` 
                    : "Extracting..."}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {extractAllDocuments 
                    ? `Extract from All Documents (${dbDocuments.length})` 
                    : "Extract from Selected Document"}
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

        <div className="grid gap-2">
          <Label>Or enter PDF URL for extraction test</Label>
          <Input
            type="url"
            value={testUrl}
            onChange={(e) => {
              setTestUrl(e.target.value);
              // Don't immediately validate on every keystroke
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
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center">
              <Info className="h-4 w-4 mr-1 inline" />
              Enter direct URL to a PDF document
            </p>
          </div>
          
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
        </div>

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
        
        {extractionError && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">{extractionError}</AlertDescription>
          </Alert>
        )}
        
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

        <Button 
          onClick={handleTest} 
          disabled={isLoading || isExtracting}
        >
          {isLoading || isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isExtracting ? "Extracting..." : "Running..."}
            </>
          ) : (
            "Run Extraction Test"
          )}
        </Button>
        
        {/* Preview of extracted text */}
        {extractionText && !isExtracting && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h3 className="text-md font-medium mb-2">Extracted Text Preview</h3>
            <pre className="whitespace-pre-wrap font-mono text-sm overflow-auto max-h-96 bg-white p-3 border rounded">
              {extractionText}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
