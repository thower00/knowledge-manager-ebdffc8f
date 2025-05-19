
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import { DocumentSelector } from "./DocumentSelector";
import { ExtractionProgress } from "./ExtractionProgress";
import { ExtractionError } from "./ExtractionError";
import { ExtractedTextDisplay } from "./ExtractedTextDisplay";
import { useDocumentExtraction } from "./hooks/useDocumentExtraction";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  } = useDocumentExtraction();

  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>PDF to Text Extraction</span>
          {connectionStatus === "error" && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-amber-500 flex items-center"
              onClick={() => setShowHelp(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" /> 
              Service Status
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Extract text content from uploaded PDF documents using PDF.js and a server-side proxy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DocumentSelector
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          setSelectedDocumentId={setSelectedDocumentId}
          isLoading={isLoading}
        />

        <Button
          onClick={() => extractTextFromDocument(selectedDocumentId)}
          disabled={!selectedDocumentId || isExtracting}
          className="w-full sm:w-auto"
        >
          {isExtracting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Extract Text
            </>
          )}
        </Button>

        <ExtractionProgress
          isExtracting={isExtracting}
          extractionProgress={extractionProgress}
        />

        <ExtractionError 
          error={error} 
          onRetry={retryExtraction}
        />

        <ExtractedTextDisplay extractedText={extractedText} />
      </CardContent>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Service Status</DialogTitle>
            <DialogDescription>
              The proxy service is currently experiencing connectivity issues.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-md">
              <h3 className="font-medium text-amber-800">Known Issues:</h3>
              <ul className="list-disc pl-5 text-sm text-amber-700 mt-2">
                <li>The Edge Function proxy service may be experiencing connectivity problems</li>
                <li>Temporary network issues between the client and Supabase Edge Functions</li>
                <li>CORS restrictions that prevent direct access to documents</li>
              </ul>
            </div>
            <div className="p-3 bg-blue-50 rounded-md">
              <h3 className="font-medium text-blue-800">Troubleshooting Steps:</h3>
              <ul className="list-disc pl-5 text-sm text-blue-700 mt-2">
                <li>Check your internet connection</li>
                <li>Try again in a few minutes</li>
                <li>Ensure document URLs are publicly accessible</li>
                <li>For Google Drive links, make sure they're shared with "Anyone with the link"</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
