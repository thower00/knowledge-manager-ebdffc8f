
import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExtractionErrorProps {
  error: string | null;
  onRetry?: () => void;
}

export const ExtractionError: React.FC<ExtractionErrorProps> = ({ error, onRetry }) => {
  if (!error) return null;

  const isNetworkError = error.includes("network") || error.includes("connection") || 
                         error.includes("Failed to fetch") || error.includes("proxy");
  const isTimeoutError = error.includes("timeout") || error.includes("timed out");
  const isAccessError = error.includes("403") || error.includes("401") || error.includes("access") || 
                       error.includes("permission");
  
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
              <li>The server-side proxy encountered an issue accessing the document.</li>
              <li>Check that the document URL is accessible and publicly shared.</li>
              <li>For Google Drive links, ensure the file is publicly shared with "Anyone with the link" access.</li>
              {onRetry && <li>Try again in a few moments - the server might be temporarily unavailable.</li>}
            </ul>
          </div>
        )}
        
        {isTimeoutError && (
          <div className="mt-2 p-3 bg-red-50 rounded-md">
            <p className="font-semibold">Timeout Issue:</p>
            <ul className="list-disc ml-5 mt-1 text-sm">
              <li>The document may be too large for processing in the allocated time.</li>
              <li>Try with a smaller document or one with fewer pages.</li>
            </ul>
          </div>
        )}
        
        {isAccessError && (
          <div className="mt-2 p-3 bg-red-50 rounded-md">
            <p className="font-semibold">Access Issue:</p>
            <ul className="list-disc ml-5 mt-1 text-sm">
              <li>This document requires special permissions that the proxy cannot provide.</li>
              <li>For Google Drive links, check that the file is shared with "Anyone with the link" access.</li>
              <li>For secured PDFs, try with a non-password-protected document.</li>
            </ul>
          </div>
        )}
        
        {onRetry && (
          <div className="mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="bg-red-50 hover:bg-red-100 text-red-900 border-red-300"
            >
              Retry Extraction
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
