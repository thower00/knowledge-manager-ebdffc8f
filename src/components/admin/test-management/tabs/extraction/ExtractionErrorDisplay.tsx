
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ExtractionErrorDisplayProps {
  extractionError: string;
}

export const ExtractionErrorDisplay = ({
  extractionError,
}: ExtractionErrorDisplayProps) => {
  return (
    <Alert variant="destructive" className="mt-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="ml-2">{extractionError}</AlertDescription>
    </Alert>
  );
};
