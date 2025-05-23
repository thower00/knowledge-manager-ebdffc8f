
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExtractDocumentsSelector } from "../document-selector";
import { ManualTextInput } from "../ManualTextInput";
import { UrlExtractionInput } from "../UrlExtractionInput";
import { ExtractionProgress } from "../ExtractionProgress";
import { ExtractedTextPreview } from "../ExtractedTextPreview";
import { ExtractionErrorDisplay } from "../ExtractionErrorDisplay";
import { useExtractionInitialization } from "../hooks/useExtractionInitialization";
import { useDocumentSelection } from "../hooks/useDocumentSelection";
import { useExtractionHandlers } from "../hooks/useExtractionHandlers";
import { useUrlValidation } from "../hooks/useUrlValidation";
import { useExtractionOptions } from "../hooks/useExtractionOptions";
import { useState } from "react";

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  // Initialize all the extraction state and data
  const {
    documents,
    proxyConnected,
    refreshDocuments,
    isExtracting,
    extractionProgress,
    extractionText,
    setExtractionText,
    extractionError,
    showExtractedText,
    setShowExtractedText,
    currentDocumentIndex,
    documentsToProcessCount
  } = useExtractionInitialization();

  // Document selection logic
  const {
    selectedDocumentIds,
    toggleDocumentSelection,
    toggleSelectAll,
    extractAllDocuments,
    setExtractAllDocuments
  } = useDocumentSelection(documents);

  // URL validation logic
  const {
    testUrl,
    setTestUrl,
    testUrlValid,
    testUrlError
  } = useUrlValidation();

  // Extraction options
  const {
    useServerExtraction,
    setUseServerExtraction,
    useProgressiveMode,
    setUseProgressiveMode
  } = useExtractionOptions();

  // Extraction handlers
  const {
    handleExtractFromDatabase,
    handleExtractFromUrl,
    handleExtractFromText
  } = useExtractionHandlers({
    selectedDocumentIds,
    extractAllDocuments,
    documents,
    testUrl,
    extractionText,
    useServerExtraction,
    useProgressiveMode,
    onRunTest,
    setExtractionText,
    refreshDocuments
  });

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
              pagesProcessed={currentDocumentIndex}
              totalPages={documentsToProcessCount}
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
