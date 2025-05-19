
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

  return (
    <div className="space-y-4">
      {/* Document Selection Section */}
      <Card>
        <CardContent className="pt-6">
          <DocumentSelector
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            setSelectedDocumentId={setSelectedDocumentId}
            onExtractClick={handleExtract}
            isLoading={isLoading}
            isExtracting={isExtracting}
            isProxyAvailable={isProxyAvailable}
            isCheckingConnection={isCheckingConnection}
            storeInDatabase={storeInDatabase}
          />
          
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
