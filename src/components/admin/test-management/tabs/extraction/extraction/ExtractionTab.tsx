
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExtractDocumentsSelector } from "../document-selector";
import { ManualTextInput } from "../ManualTextInput";
import { UrlExtractionInput } from "../UrlExtractionInput";
import { ExtractionProgress } from "../ExtractionProgress";
import { ExtractedTextPreview } from "../ExtractedTextPreview";
import { ExtractionErrorDisplay } from "../ExtractionErrorDisplay";
import { useState } from "react";
import { useServerExtractionProcess } from "../hooks/useServerExtractionProcess";
import { useDocumentSelection } from "../hooks/useDocumentSelection";
import { useExtractionHandlers } from "../hooks/useExtractionHandlers";
import { useUrlValidation } from "../hooks/useUrlValidation";
import { useExtractionOptions } from "../hooks/useExtractionOptions";
import { useExtractionInitialization } from "../hooks/useExtractionInitialization";

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  // State for showing extracted text
  const [showExtractedText, setShowExtractedText] = useState(true);
  const [extractionText, setExtractionText] = useState("");
  
  // Initialize extraction process
  const { proxyConnected, handleRefresh } = useExtractionInitialization();
  
  // Get extraction process state
  const extractionProcess = useServerExtractionProcess();
  const { 
    isExtracting, 
    extractionProgress, 
    extractionError,
    currentDocumentIndex,
    pagesProcessed,
    totalPages,
    isProgressiveMode 
  } = extractionProcess;
  
  // Document selection logic
  const {
    dbDocuments: documents,
    selectedDocumentIds,
    toggleDocumentSelection,
    toggleSelectAll,
    extractAllDocuments,
    setExtractAllDocuments,
    refreshDocuments
  } = useDocumentSelection();
  const documentsToProcessCount = documents?.length || 0;

  // URL validation logic
  const {
    testUrl,
    setTestUrl,
    testUrlValid,
    testUrlError
  } = useUrlValidation();

  // Extraction options
  const { extractionOptions, setExtractionOptions } = useExtractionOptions();
  // Use the progressive mode from extraction options
  const useProgressiveMode = extractionOptions.extractionMode === 'progressive';
  // Legacy option for backward compatibility
  const useServerExtraction = true;
  
  // Create a handler for text input changes
  const handleExtractFromText = () => {
    // Simply pass the current text to onRunTest
    if (onRunTest && extractionText) {
      onRunTest({ extractionText });
    }
  };

  // Extraction handlers
  const { 
    handleExtractFromDatabase,
    handleExtractFromUrl
  } = useExtractionHandlers(
    (extractedText, testUrl) => {
      setExtractionText(extractedText);
      onRunTest({ extractionText: extractedText, testUrl });
    }
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Text Extraction Test</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Database Documents Section */}
          <ExtractDocumentsSelector
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            toggleDocumentSelection={toggleDocumentSelection}
            toggleSelectAll={toggleSelectAll}
            refreshDocuments={refreshDocuments}
            isLoading={isLoading}
            isExtracting={isExtracting}
            onExtract={handleExtractFromDatabase}
            extractAllDocuments={extractAllDocuments}
            setExtractAllDocuments={setExtractAllDocuments}
            proxyConnected={proxyConnected}
            currentDocumentIndex={currentDocumentIndex}
            documentsToProcessCount={documentsToProcessCount}
          />

          <Separator />

          {/* URL Extraction Section */}
          <UrlExtractionInput
            testUrl={testUrl}
            setTestUrl={setTestUrl}
            testUrlValid={testUrlValid}
            testUrlError={testUrlError}
            handleExtractFromUrl={handleExtractFromUrl}
            isExtracting={isExtracting}
          />

          <Separator />

          {/* Manual Text Input Section */}
          <ManualTextInput
            extractionText={extractionText}
            setExtractionText={setExtractionText}
            isDisabled={isExtracting}
          />

          {/* Progress Display */}
          {isExtracting && (
            <ExtractionProgress
              extractionProgress={extractionProgress}
              isProgressiveMode={useProgressiveMode}
              pagesProcessed={pagesProcessed}
              totalPages={totalPages}
            />
          )}

          {/* Error Display */}
          {extractionError && (
            <ExtractionErrorDisplay
              extractionError={extractionError}
              onRetry={() => {
                if (selectedDocumentIds.length > 0 || extractAllDocuments) {
                  handleExtractFromDatabase();
                } else if (testUrlValid) {
                  handleExtractFromUrl();
                }
              }}
            />
          )}

          {/* Extracted Text Preview */}
          {extractionText && !isExtracting && (
            <ExtractedTextPreview
              extractionText={extractionText}
              showExtractedText={showExtractedText}
              setShowExtractedText={setShowExtractedText}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
