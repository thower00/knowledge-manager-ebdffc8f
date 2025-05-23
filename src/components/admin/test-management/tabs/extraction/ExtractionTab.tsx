
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
import { Loader2, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

import { ExtractDocumentsSelector } from "./ExtractDocumentsSelector";
import { UrlExtractionInput } from "./UrlExtractionInput";
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
    checkProcessingFunction,
    checkingProcessingFunction,
    handleRefresh,
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Document Extraction</CardTitle>
            <CardDescription>
              Verify document text extraction functionality
            </CardDescription>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isExtracting || checkingProcessingFunction}
          >
            {(checkingProcessingFunction) ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Server-side processing status */}
        {processingFunctionAvailable === false && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Server-side PDF processing unavailable</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  The server-side PDF processing function isn't responding. Extraction may not work correctly.
                  Try refreshing the page or contact support if this persists.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                    onClick={checkProcessingFunction}
                    disabled={checkingProcessingFunction}
                  >
                    {checkingProcessingFunction ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Check Again
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {processingFunctionAvailable === true && (
          <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Server-side PDF processing enabled</AlertTitle>
            <AlertDescription>
              Using high-performance server-side PDF processing for better reliability.
            </AlertDescription>
          </Alert>
        )}

        {/* New Document Selector Component */}
        <ExtractDocumentsSelector 
          documents={dbDocuments}
          selectedDocumentIds={selectedDocumentIds}
          toggleDocumentSelection={toggleDocumentSelection}
          toggleSelectAll={toggleSelectAll}
          refreshDocuments={refreshDocuments}
          isLoading={isLoadingDocuments}
          isExtracting={isExtracting}
          onExtract={handleExtractFromDatabase}
          extractAllDocuments={extractAllDocuments}
          setExtractAllDocuments={setExtractAllDocuments}
          proxyConnected={proxyConnected}
          currentDocumentIndex={currentDocumentIndex}
          documentsToProcessCount={documentsToProcess.length}
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
                description: "Please extract text first",
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
}
