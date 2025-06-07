
import React from "react";
import { SimplifiedPdfUpload } from "@/components/admin/document-extraction/SimplifiedPdfUpload";

interface ManualPdfUploadProps {
  onExtract?: (extractedText: string, fileName: string) => void;
}

export function ManualPdfUpload({ onExtract }: ManualPdfUploadProps) {
  const handleExtract = (extractedText: string, fileName: string) => {
    // Call the original callback with just the text and filename
    if (onExtract) {
      onExtract(extractedText, fileName);
    }
  };

  return <SimplifiedPdfUpload onExtract={handleExtract} />;
}
