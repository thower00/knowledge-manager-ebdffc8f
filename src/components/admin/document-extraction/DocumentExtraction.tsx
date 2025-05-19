
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, AlertTriangle, RefreshCw } from "lucide-react";
import { DocumentSelector } from "./DocumentSelector";
import { ExtractionProgress } from "./ExtractionProgress";
import { ExtractionError } from "./ExtractionError";
import { ExtractedTextDisplay } from "./ExtractedTextDisplay";
import { useDocumentExtraction } from "./hooks/useDocumentExtraction";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

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
    checkConnection,
  } = useDocumentExtraction();

  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();
  
  // Show a toast notification when the connection status changes
  useEffect(() => {
    if (connectionStatus === "error") {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "The PDF extraction service is currently unavailable. Please try again later.",
      });
    } else if (connectionStatus === "connected") {
      toast({
        title: "Service Connected",
        description: "The PDF extraction service is now available.",
      });
    }
  }, [connectionStatus, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>PDF to Text Extraction</span>
          <ServiceStatusBadge 
            status={connectionStatus} 
            onRefresh={() => checkConnection(true)} 
            onShowHelp={() => setShowHelp(true)}
          />
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
          disabled={!selectedDocumentId || isExtracting || connectionStatus === "error"}
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
            <Button onClick={() => checkConnection(true)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Connection Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// New reusable component for service status display
function ServiceStatusBadge({ 
  status, 
  onRefresh, 
  onShowHelp 
}: { 
  status: "idle" | "checking" | "connected" | "error"; 
  onRefresh: () => void;
  onShowHelp: () => void;
}) {
  if (status === "checking") {
    return (
      <div className="flex items-center text-blue-500">
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        <span className="text-sm">Checking...</span>
      </div>
    );
  }
  
  if (status === "connected") {
    return (
      <div className="flex items-center text-green-500">
        <span className="relative flex h-3 w-3 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm">Service Online</span>
      </div>
    );
  }
  
  if (status === "error") {
    return (
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-amber-500 flex items-center h-8 px-2"
          onClick={onShowHelp}
        >
          <AlertTriangle className="h-4 w-4 mr-1" /> 
          <span className="text-sm">Service Unavailable</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  
  return null;
}
