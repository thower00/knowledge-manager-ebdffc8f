
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";
import { DocumentSelector } from "./DocumentSelector";
import { ExtractionProgress } from "./ExtractionProgress";
import { ExtractedTextDisplay } from "./ExtractedTextDisplay";
import { ExtractionError } from "./ExtractionError";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDocumentExtraction } from "./hooks/useDocumentExtraction";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoCircle } from "lucide-react";

export function DocumentExtraction() {
  const {
    documents,
    isLoading,
    selectedDocumentId,
    setSelectedDocumentId,
    extractTextFromDocument,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
    retryExtraction,
    connectionStatus,
    connectionError,
    checkConnection,
    storeInDatabase,
    setStoreInDatabase
  } = useDocumentExtraction();
  
  // Derived state based on connection status
  const isCheckingConnection = connectionStatus === "checking";
  const isProxyAvailable = connectionStatus === "connected";

  // Effects to handle document selection
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  
  useEffect(() => {
    if (selectedDocumentId && documents) {
      const doc = documents.find((doc) => doc.id === selectedDocumentId);
      setSelectedDocument(doc || null);
    } else {
      setSelectedDocument(null);
    }
  }, [selectedDocumentId, documents]);

  // Function to handle extraction button click
  const handleExtract = () => {
    extractTextFromDocument(selectedDocumentId);
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
            storeInDatabase={storeInDatabase}
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
                      <InfoCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{connectionError || "Could not connect to proxy service"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {connectionStatus === 'error' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckConnection} 
                className="ml-2 h-7 text-xs"
                disabled={connectionStatus === 'checking'}
              >
                Retry Connection
              </Button>
            )}
          </div>
          
          {/* Document Binary Storage Toggle */}
          <div className="mt-4 flex items-center space-x-2">
            <Switch 
              id="store-binary" 
              checked={storeInDatabase}
              onCheckedChange={setStoreInDatabase}
            />
            <Label htmlFor="store-binary">Store document binary in database</Label>
          </div>
          
          {storeInDatabase && (
            <p className="text-sm text-muted-foreground mt-2">
              Document binary will be stored in the database for faster access in the future.
              {selectedDocument && !error && extractedText && 
                " The document has been stored and will be retrieved from the database on next extraction."}
            </p>
          )}
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
          onRetry={retryExtraction}
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
