
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseDocumentExtractor } from "../DatabaseDocumentExtractor";
import { ExtractedTextPreview } from "../ExtractedTextPreview";
import { useState } from "react";

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  const [extractionText, setExtractionText] = useState("");
  const [showExtractedText, setShowExtractedText] = useState(true);
  
  // Handler for database document extraction
  const handleDatabaseExtraction = (extractedText: string) => {
    console.log("Database extraction complete with text of length:", extractedText?.length);
    setExtractionText(extractedText);
    onRunTest({ extractionText: extractedText });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Text Extraction Test</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Database Documents Section */}
          <DatabaseDocumentExtractor
            onExtract={handleDatabaseExtraction}
            isExtracting={isLoading}
          />

          {/* Extracted Text Preview */}
          {extractionText && !isLoading && (
            <ExtractedTextPreview
              extractionText={extractionText}
              showExtractedText={showExtractedText}
              setShowExtractedText={setShowExtractedText}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
