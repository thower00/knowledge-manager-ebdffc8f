
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";
import { DocumentSelector } from "./DocumentSelector";
import { ExtractionProgress } from "./ExtractionProgress";
import { ExtractedTextDisplay } from "./ExtractedTextDisplay";
import { ExtractionError } from "./ExtractionError";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTextExtraction } from "./hooks/useTextExtraction";
import { useProcessedDocumentsFetch } from "./hooks/useProcessedDocumentsFetch";
import { useProxyConnectionStatus } from "./hooks/useProxyConnectionStatus";

export function DocumentExtraction() {
  const {
    selectedDocumentId,
    setSelectedDocumentId,
    extractTextFromDocument,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
    retryExtraction,
    storeInDatabase,
    setStoreInDatabase
  } = useTextExtraction();

  const { documents, isLoading: isLoadingDocuments } = useProcessedDocumentsFetch();
  const { isCheckingConnection, isProxyAvailable } = useProxyConnectionStatus();

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

  // Function to handle document selection
  const handleDocumentSelection = (documentId: string) => {
    setSelectedDocumentId(documentId);
  };

  // Function to handle extraction button click
  const handleExtract = () => {
    extractTextFromDocument(selectedDocumentId, documents);
  };

  return (
    <div className="space-y-4">
      {/* Document Selection Section */}
      <Card>
        <CardContent className="pt-6">
          <DocumentSelector
            documents={documents || []}
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={handleDocumentSelection}
            onExtractClick={handleExtract}
            isLoading={isLoadingDocuments}
            isExtracting={isExtracting}
            isProxyAvailable={isProxyAvailable}
            isCheckingConnection={isCheckingConnection}
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
        <ExtractionProgress progress={extractionProgress} />
      )}

      {error && (
        <ExtractionError 
          error={error} 
          onRetry={retryExtraction}
          documentTitle={selectedDocument?.title || "document"}
        />
      )}

      {extractedText && !error && (
        <ExtractedTextDisplay 
          text={extractedText} 
          documentTitle={selectedDocument?.title || "Unknown Document"}
        />
      )}
    </div>
  );
}
