
import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ExtractionErrorProps {
  error: string | null;
}

export const ExtractionError: React.FC<ExtractionErrorProps> = ({ error }) => {
  if (!error) return null;

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Extraction Error</AlertTitle>
      <AlertDescription>
        {error}
        {error.includes("proxy") && (
          <p className="mt-2">
            <strong>Tip:</strong> The server-side proxy encountered an issue 
            accessing the document. This approach should bypass CORS restrictions,
            but there might be other access limitations on the document.
          </p>
        )}
        {error.includes("CORS") && (
          <p className="mt-2">
            <strong>Tip:</strong> Make sure the document is publicly accessible.
            Google Drive links often have CORS restrictions for direct downloads.
            Consider using a different file hosting service or implement a server-side proxy.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};
