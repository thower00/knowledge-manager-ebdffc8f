
import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExtractionErrorProps {
  error: string | null;
  onRetry?: () => void;
}

export const ExtractionError: React.FC<ExtractionErrorProps> = ({ error, onRetry }) => {
  if (!error) return null;

  // Categorize the error to provide better guidance
  const isNetworkError = error.includes("network") || error.includes("connection") || 
                         error.includes("Failed to fetch") || error.includes("proxy");
  const isTimeoutError = error.includes("timeout") || error.includes("timed out");
  const isAccessError = error.includes("403") || error.includes("401") || error.includes("access") || 
                       error.includes("permission");
  const isPdfError = error.includes("PDF") || error.includes("document format");
  
  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Extraction Error</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{error}</p>
        
        {isNetworkError && (
          <div className="mt-2 p-3 bg-red-50 rounded-md">
            <p className="font-semibold">Connection Issue:</p>
            <ul className="list-disc ml-5 mt-1 text-sm">
              <li>Check your internet connection and try again</li>
              <li>The Supabase Edge Function might be temporarily unavailable</li>
              <li>For Google Drive links, ensure the file is publicly shared with "Anyone with the link" access</li>
              <li>If using a corporate network, check if there are firewall restrictions</li>
            </ul>
          </div>
        )}
        
        {isTimeoutError && (
          <div className="mt-2 p-3 bg-red-50 rounded-md">
            <p className="font-semibold">Timeout Issue:</p>
            <ul className="list-disc ml-5 mt-1 text-sm">
              <li>The document may be too large for processing in the allocated time</li>
              <li>Try with a smaller document or one with fewer pages</li>
              <li>The server might be experiencing high load</li>
              <li>Try again later when the service might be less busy</li>
            </ul>
          </div>
        )}
        
        {isAccessError && (
          <div className="mt-2 p-3 bg-red-50 rounded-md">
            <p className="font-semibold">Access Issue:</p>
            <ul className="list-disc ml-5 mt-1 text-sm">
              <li>This document requires special permissions that the proxy cannot provide</li>
              <li>For Google Drive links, check that the file is shared with "Anyone with the link" access</li>
              <li>For secured PDFs, try with a non-password-protected document</li>
              <li>Some corporate documents may have DRM protection that blocks extraction</li>
            </ul>
          </div>
        )}

        {isPdfError && (
          <div className="mt-2 p-3 bg-red-50 rounded-md">
            <p className="font-semibold">Document Format Issue:</p>
            <ul className="list-disc ml-5 mt-1 text-sm">
              <li>The file may not be a valid PDF document</li>
              <li>The PDF might be corrupted or have an unusual structure</li>
              <li>Try with a different PDF document or check if the file can be opened in a PDF viewer</li>
            </ul>
          </div>
        )}
        
        {onRetry && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="bg-red-50 hover:bg-red-100 text-red-900 border-red-300 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Retry Extraction
            </Button>
            <Button
              variant="link"
              size="sm"
              onClick={() => window.open('https://docs.lovable.dev/tips-tricks/troubleshooting', '_blank')}
              className="text-red-600 flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-1" /> View Troubleshooting Guide
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
