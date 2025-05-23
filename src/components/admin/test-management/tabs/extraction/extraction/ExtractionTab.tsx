
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { DatabaseDocumentExtractor } from "../DatabaseDocumentExtractor";
import { ManualTextInput } from "../ManualTextInput";
import { UrlExtractionInput } from "../UrlExtractionInput";
import { ExtractionProgress } from "../ExtractionProgress";
import { ExtractedTextPreview } from "../ExtractedTextPreview";
import { ExtractionErrorDisplay } from "../ExtractionErrorDisplay";
import { useState, useEffect } from "react";
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
  const [manualInputText, setManualInputText] = useState("");
  
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
  
  // Handler for manual text extraction
  const handleExtractFromText = () => {
    if (onRunTest && manualInputText) {
      // Create a real extraction result based on the manual text
      const processedText = manualInputText;
      setExtractionText(processedText);
      onRunTest({ extractionText: processedText });
    }
  };

  // Extraction handlers
  const { 
    handleExtractFromUrl
  } = useExtractionHandlers(
    (extractedText, testUrl) => {
      console.log("Extraction complete callback triggered with text of length:", extractedText?.length);
      // Make sure we're not using placeholder text here
      const realExtractedText = extractedText || "";
      setExtractionText(realExtractedText);
      onRunTest({ extractionText: realExtractedText, testUrl });
    }
  );

  // Handler for database document extraction
  const handleDatabaseExtraction = (extractedText: string) => {
    console.log("Database extraction complete with text of length:", extractedText?.length);
    // Ensure we're passing the actual extracted text, not placeholder
    const realExtractedText = extractedText || "";
    setExtractionText(realExtractedText);
    onRunTest({ extractionText: realExtractedText });
  };
  
  // Debug log for tracking extraction text
  useEffect(() => {
    if (extractionText) {
      console.log(`Current extraction text (${extractionText.length} chars): "${extractionText.substring(0, 50)}..."`);
    }
  }, [extractionText]);

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
            extractionText={manualInputText}
            setExtractionText={setManualInputText}
            isDisabled={isExtracting}
          />
          
          {/* Add a run button for manual text extraction */}
          <Button
            onClick={handleExtractFromText}
            disabled={isExtracting || !manualInputText}
            className="mt-2"
          >
            Extract from Pasted Text
          </Button>

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
