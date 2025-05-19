
import React from "react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface ExtractionProgressProps {
  isExtracting: boolean;
  extractionProgress: number;
}

export const ExtractionProgress: React.FC<ExtractionProgressProps> = ({
  isExtracting,
  extractionProgress,
}) => {
  if (!isExtracting && extractionProgress === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Extraction Progress</Label>
      <Progress value={extractionProgress} className="h-2" />
      <p className="text-sm text-muted-foreground text-center">
        {extractionProgress}% complete
      </p>
    </div>
  );
};
