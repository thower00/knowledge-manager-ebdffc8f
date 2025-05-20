
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
import { AlertTriangle, Info, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validatePdfUrl, convertGoogleDriveUrl } from "@/components/admin/document-extraction/utils/urlUtils";
import { extractPdfText } from "@/components/admin/document-extraction/utils/pdfUtils";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";

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
  }, []);

  // Validate URL when it changes
  useEffect(() => {
    if (testUrl) {
      validateUrl(testUrl);
    }
  }, [testUrl]);

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

  const handleTest = () => {
    if (testUrl) {
      handleExtractFromUrl();
    } else if (extractionText) {
      onRunTest({ extractionText });
      toast({
        title: "Test completed",
        description: "Extraction test completed with provided text",
      });
    } else {
      toast({
        title: "No input",
        description: "Please provide either a URL or text to extract",
        variant: "destructive"
      });
    }
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
        <div className="grid gap-2">
          <Label>Enter PDF URL for extraction test</Label>
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
            
            {proxyConnected !== null && (
              <div className="flex items-center text-sm">
                <span className={`h-2 w-2 rounded-full mr-2 ${proxyConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>{proxyConnected ? 'Proxy Available' : 'Proxy Unavailable'}</span>
              </div>
            )}
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
          
          {extractionError && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">{extractionError}</AlertDescription>
            </Alert>
          )}
          
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
          
          <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded-md">
            <p className="font-medium">Google Drive URL Tips:</p>
            <ul className="list-disc ml-5 mt-1 text-sm">
              <li>For Google Drive PDFs, use URL format: <code className="px-1 bg-blue-100">https://drive.google.com/uc?export=download&id=YOUR_FILE_ID&alt=media</code></li>
              <li>Change <code className="px-1 bg-blue-100">.../file/d/FILE_ID/view</code> to <code className="px-1 bg-blue-100">.../file/d/FILE_ID/view?alt=media</code></li>
              <li>File must be shared with "Anyone with the link"</li>
            </ul>
          </div>
          
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

        <Button 
          onClick={handleTest} 
          disabled={isLoading || isExtracting || (testUrl && !!testUrlError)}
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
      </CardContent>
    </Card>
  );
}
