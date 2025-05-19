
import React from "react";
import { Label } from "@/components/ui/label";

interface ExtractedTextDisplayProps {
  extractedText: string;
  documentTitle?: string;
}

export const ExtractedTextDisplay: React.FC<ExtractedTextDisplayProps> = ({
  extractedText,
  documentTitle,
}) => {
  if (!extractedText) return null;

  return (
    <div className="mt-6 space-y-2">
      <Label>
        {documentTitle ? `Extracted Text from ${documentTitle}` : "Extracted Text"}
      </Label>
      <div className="bg-gray-50 p-4 rounded-md border">
        <pre className="whitespace-pre-wrap font-mono text-sm overflow-auto max-h-96">
          {extractedText}
        </pre>
      </div>
    </div>
  );
};
