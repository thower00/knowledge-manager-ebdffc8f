
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DatabaseDocumentExtractor } from "../DatabaseDocumentExtractor";
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
  
  // Create a handler for text input changes
  const handleExtractFromText = () => {
    // Simply pass the current text to onRunTest
    if (onRunTest && extractionText) {
      onRunTest({ extractionText });
    }
  };

  // Extraction handlers
  const { 
    handleExtractFromUrl
  } = useExtractionHandlers(
    (extractedText, testUrl) => {
      setExtractionText(extractedText);
      onRunTest({ extractionText: extractedText, testUrl });
    }
  );

  // Handler for database document extraction
  const handleDatabaseExtraction = (extractedText: string) => {
    setExtractionText(extractedText);
    onRunTest({ extractionText: extractedText });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Text Extraction Test</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Database Documents Section */}
          <DatabaseDocumentExtractor
            onExtract={handleDatabaseExtraction}
            isExtracting={isExtracting}
            proxyConnected={proxyConnected}
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
                if (testUrlValid) {
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
