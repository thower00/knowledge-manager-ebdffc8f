
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  message = "Error Loading Document", 
  description = "Could not load document chunks for preview.",
  onRetry
}: ErrorStateProps) {
  return (
    <div className="h-60 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <p className="text-destructive font-medium mb-2">{message}</p>
        <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="min-w-[100px]">
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
