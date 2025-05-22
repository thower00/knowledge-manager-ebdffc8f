
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";

import { DatabaseDocumentSelector } from "./DatabaseDocumentSelector";
import { UrlExtractionInput } from "./UrlExtractionInput";
import { ManualTextInput } from "./ManualTextInput";
import { ExtractionProgress } from "./ExtractionProgress";
import { ExtractionErrorDisplay } from "./ExtractionErrorDisplay";
import { TroubleshootingPanel } from "./TroubleshootingPanel";
import { ExtractedTextPreview } from "./ExtractedTextPreview";
import { ExtractionOptions } from "./ExtractionOptions";

import { useDocumentExtraction } from "./hooks/useDocumentExtraction";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  const [showExtractedText, setShowExtractedText] = useState(true);
  const { toast } = useToast();
  const {
    extractionText,
    setExtractionText,
    testUrl,
    setTestUrl,
    testUrlError,
    testUrlValid,
    isExtracting,
    extractionProgress,
    extractionError,
    proxyConnected,
    extractionOptions,
    setExtractionOptions,
    handleExtractFromUrl,
    handleExtractFromDatabase,
    selectedDocumentIds,
    dbDocuments,
    isLoadingDocuments,
    extractAllDocuments,
    setExtractAllDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    refreshDocuments,
    currentDocumentIndex,
    documentsToProcess,
    processingFunctionAvailable,
    // Progressive extraction states
    pagesProcessed,
    totalPages,
    isProgressiveMode,
    // Status message
    extractionStatus
  } = useDocumentExtraction({ onRunTest });

  // Function to handle retry based on current context
  const handleRetry = () => {
    if (testUrl && testUrlValid) {
      // If there's a valid URL, retry URL extraction
      handleExtractFromUrl();
    } else if (selectedDocumentIds.length > 0 || extractAllDocuments) {
      // If there are selected documents, retry database extraction
      handleExtractFromDatabase();
    } else {
      toast({
        title: "Cannot Retry",
        description: "Please provide a valid URL or select documents first",
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
        {/* Server-side processing status */}
        {!processingFunctionAvailable && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Server-side PDF processing unavailable</AlertTitle>
            <AlertDescription>
              The server-side PDF processing function isn't responding. Extraction may not work correctly.
              Try refreshing the page or contact support if this persists.
            </AlertDescription>
          </Alert>
        )}
        
        {processingFunctionAvailable && (
          <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Server-side PDF processing enabled</AlertTitle>
            <AlertDescription>
              Using high-performance server-side PDF processing for better reliability.
            </AlertDescription>
          </Alert>
        )}

        {/* Database Document Selector Component */}
        <DatabaseDocumentSelector 
          dbDocuments={dbDocuments}
          selectedDocumentIds={selectedDocumentIds}
          toggleDocumentSelection={toggleDocumentSelection}
          toggleSelectAll={toggleSelectAll}
          isLoadingDocuments={isLoadingDocuments}
          refreshDocuments={refreshDocuments}
          extractAllDocuments={extractAllDocuments}
          setExtractAllDocuments={setExtractAllDocuments}
          handleExtractFromDatabase={handleExtractFromDatabase}
          isExtracting={isExtracting}
          currentDocumentIndex={currentDocumentIndex}
          documentsToProcess={documentsToProcess}
          proxyConnected={proxyConnected}
        />

        {/* URL Input Component */}
        <UrlExtractionInput
          testUrl={testUrl}
          setTestUrl={setTestUrl}
          testUrlValid={testUrlValid}
          testUrlError={testUrlError}
          handleExtractFromUrl={handleExtractFromUrl}
          isExtracting={isExtracting}
        />
        
        {/* Extraction Options Component */}
        <ExtractionOptions
          options={extractionOptions}
          setOptions={setExtractionOptions}
          isExtracting={isExtracting}
        />

        {/* Manual Text Input Component */}
        <ManualTextInput
          extractionText={extractionText}
          setExtractionText={setExtractionText}
        />

        {/* Extraction Progress Display */}
        {isExtracting && (
          <ExtractionProgress 
            extractionProgress={extractionProgress}
            isProgressiveMode={isProgressiveMode}
            pagesProcessed={pagesProcessed}
            totalPages={totalPages}
            status={extractionStatus}
          />
        )}
        
        {/* Error Display */}
        {extractionError && (
          <ExtractionErrorDisplay 
            extractionError={extractionError}
            onRetry={handleRetry}
          />
        )}
        
        {/* Troubleshooting Panel */}
        <TroubleshootingPanel />

        {/* Test Run Button */}
        <Button 
          onClick={() => {
            if (extractionText) {
              onRunTest({ extractionText });
              toast({
                title: "Test Complete",
                description: "Extraction test completed with provided text",
              });
            } else {
              toast({
                title: "No Text Available",
                description: "Please extract text first or paste it manually",
                variant: "destructive"
              });
            }
          }}
          disabled={!extractionText || isLoading || isExtracting}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Test...
            </>
          ) : (
            "Run Extraction Test"
          )}
        </Button>
        
        {/* Preview of extracted text */}
        {extractionText && (
          <ExtractedTextPreview 
            extractionText={extractionText}
            showExtractedText={showExtractedText}
            setShowExtractedText={setShowExtractedText}
          />
        )}
      </CardContent>
    </Card>
  );
};
