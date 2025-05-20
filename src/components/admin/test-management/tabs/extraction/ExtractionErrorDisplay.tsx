
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ExtractionErrorDisplayProps {
  extractionError: string;
  onRetry?: () => void;
}

export const ExtractionErrorDisplay = ({
  extractionError,
  onRetry
}: ExtractionErrorDisplayProps) => {
  // Determine if the error is related to timeout
  const isTimeoutError = extractionError.toLowerCase().includes("timeout") || 
                         extractionError.toLowerCase().includes("timed out");
  
  // Determine if the error is related to PDF format
  const isPdfFormatError = extractionError.toLowerCase().includes("valid pdf") || 
                          extractionError.toLowerCase().includes("format");
  
  // Determine if it's a worker error
  const isWorkerError = extractionError.toLowerCase().includes("worker");
  
  // Generate helpful suggestions based on error type
  const getSuggestions = () => {
    if (isTimeoutError) {
      return (
        <ul className="list-disc pl-5 mt-2 text-sm">
          <li>The PDF might be too large or complex</li>
          <li>Try with a smaller or simpler document</li>
          <li>Check your internet connection stability</li>
          <li>Try extracting specific pages rather than the entire document</li>
        </ul>
      );
    } else if (isPdfFormatError) {
      return (
        <ul className="list-disc pl-5 mt-2 text-sm">
          <li>Ensure the file is actually a PDF document</li>
          <li>The PDF might be corrupted or password-protected</li>
          <li>Try downloading the file again from source</li>
          <li>Try converting the document to PDF using an online converter</li>
        </ul>
      );
    } else if (isWorkerError) {
      return (
        <ul className="list-disc pl-5 mt-2 text-sm">
          <li>Your browser may be blocking access to the PDF processing scripts</li>
          <li>Try disabling content blockers or using a different browser</li>
          <li>Clear your browser cache and refresh the page</li>
          <li>Check your internet connection</li>
        </ul>
      );
    }
    
    return null;
  };

  return (
    <Alert variant="destructive" className="mt-2">
      <AlertTriangle className="h-4 w-4" />
      <div className="ml-2">
        <AlertTitle className="text-base">Extraction Failed</AlertTitle>
        <AlertDescription className="text-sm mt-1">
          {extractionError}
          
          {getSuggestions()}
          
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry} 
              className="mt-2 bg-red-950/10 hover:bg-red-950/20 text-destructive-foreground"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry Extraction
            </Button>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
};
