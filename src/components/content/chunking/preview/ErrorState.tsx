
import { Button } from "@/components/ui/button";

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
        <p className="text-destructive font-medium mb-2">{message}</p>
        <p className="text-muted-foreground mb-4">{description}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
