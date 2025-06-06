
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";
import { DocumentSelector } from "./DocumentSelector";
import { ExtractionProgress } from "./ExtractionProgress";
import { ExtractedTextDisplay } from "./ExtractedTextDisplay";
import { ExtractionError } from "./ExtractionError";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, RefreshCw, Loader2 } from "lucide-react";
import { useProcessedDocumentsFetch } from "./hooks/useProcessedDocumentsFetch";
import { useProxyConnectionStatus } from "./hooks/useProxyConnectionStatus";
import { useClientPdfExtraction } from "./hooks/useClientPdfExtraction";

export function DocumentExtraction() {
  const { data: documents, isLoading } = useProcessedDocumentsFetch();
  const { connectionStatus, connectionError, checkConnection } = useProxyConnectionStatus();
  const {
    extractTextFromDocument,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
    resetExtraction
  } = useClientPdfExtraction();
  
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  
  // Derived state based on connection status
  const isCheckingConnection = connectionStatus === "checking";
  const isProxyAvailable = connectionStatus === "connected";

  // Effects to handle document selection
  useEffect(() => {
    if (selectedDocumentId && documents) {
      const doc = documents.find((doc) => doc.id === selectedDocumentId);
      setSelectedDocument(doc || null);
    } else {
      setSelectedDocument(null);
    }
  }, [selectedDocumentId, documents]);

  // Function to handle extraction button click
  const handleExtract = async () => {
    if (selectedDocument) {
      resetExtraction();
      await extractTextFromDocument(selectedDocument);
    }
  };
  
  // Function to manually check connection
  const handleCheckConnection = () => {
    checkConnection(true);
  };

  return (
    <div className="space-y-4">
      {/* Document Selection Section */}
      <Card>
        <CardContent className="pt-6">
          <DocumentSelector
            documents={documents || []}
            selectedDocumentId={selectedDocumentId}
            setSelectedDocumentId={setSelectedDocumentId}
            onExtractClick={handleExtract}
            isLoading={isLoading}
            isExtracting={isExtracting}
            isProxyAvailable={isProxyAvailable}
            isCheckingConnection={isCheckingConnection}
          />
          
          {/* Connection status indicator */}
          <div className="mt-4 flex items-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`}></span>
            <span className="text-sm text-muted-foreground">
              Proxy Service: {
                connectionStatus === 'connected' ? 'Available' : 
                connectionStatus === 'checking' ? 'Checking...' : 
                'Unavailable'
              }
            </span>
            {connectionStatus === 'error' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 py-1">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{connectionError || "Could not connect to proxy service"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCheckConnection} 
              className="h-7 text-xs"
              disabled={isCheckingConnection}
            >
              {isCheckingConnection ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Check Connection
                </>
              )}
            </Button>
          </div>
          
          {/* PDF.js Status Indicator */}
          <div className="mt-2 flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="text-sm text-muted-foreground">
              PDF Processing: Client-side PDF.js (Enhanced)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Progress, Text Display and Error sections */}
      {isExtracting && (
        <ExtractionProgress 
          isExtracting={isExtracting} 
          extractionProgress={extractionProgress} 
        />
      )}

      {error && (
        <ExtractionError 
          error={error} 
          onRetry={handleExtract}
          documentTitle={selectedDocument?.title}
        />
      )}

      {extractedText && !error && (
        <ExtractedTextDisplay 
          extractedText={extractedText} 
          documentTitle={selectedDocument?.title}
        />
      )}
    </div>
  );
}
