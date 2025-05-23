
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ExtractionProgressProps {
  extractionProgress: number;
  isProgressiveMode?: boolean;
  pagesProcessed?: number;
  totalPages?: number;
}

export function ExtractionProgress({
  extractionProgress,
  isProgressiveMode = false,
  pagesProcessed = 0,
  totalPages = 0
}: ExtractionProgressProps) {
  // Format the progress value
  const progressValue = Math.min(Math.max(0, extractionProgress), 100);
  const progressText = `${Math.round(progressValue)}%`;
  
  return (
    <div className="space-y-2 my-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Extracting text...</span>
        </div>
        <span className="font-medium">{progressText}</span>
      </div>
      
      <Progress value={progressValue} className="h-2" />
      
      {isProgressiveMode && totalPages > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Processing page {pagesProcessed} of {totalPages}
        </div>
      )}
    </div>
  );
}
