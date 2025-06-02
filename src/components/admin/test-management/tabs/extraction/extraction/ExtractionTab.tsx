
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatabaseDocumentExtractor } from "../DatabaseDocumentExtractor";
import { ExtractedTextPreview } from "../ExtractedTextPreview";
import { ManualPdfUpload } from "../ManualPdfUpload";
import { useState } from "react";

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  const [extractionText, setExtractionText] = useState("");
  const [showExtractedText, setShowExtractedText] = useState(true);
  const [extractionSource, setExtractionSource] = useState<string>("");
  
  // Handler for database document extraction
  const handleDatabaseExtraction = (extractedText: string) => {
    console.log("Database extraction complete with text of length:", extractedText?.length);
    setExtractionText(extractedText);
    setExtractionSource("Database Document");
    onRunTest({ extractionText: extractedText });
  };

  // Handler for manual PDF upload extraction
  const handleManualExtraction = (extractedText: string, fileName: string) => {
    console.log("Manual extraction complete with text of length:", extractedText?.length);
    setExtractionText(extractedText);
    setExtractionSource(`Manual Upload: ${fileName}`);
    onRunTest({ extractionText: extractedText });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Text Extraction Test</CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="manual" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Upload</TabsTrigger>
              <TabsTrigger value="database">Database Documents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4">
              <ManualPdfUpload onExtract={handleManualExtraction} />
            </TabsContent>
            
            <TabsContent value="database" className="space-y-4">
              <DatabaseDocumentExtractor
                onExtract={handleDatabaseExtraction}
                isExtracting={isLoading}
              />
            </TabsContent>
          </Tabs>

          {/* Extracted Text Preview */}
          {extractionText && !isLoading && (
            <div className="mt-6">
              <ExtractedTextPreview
                extractionText={extractionText}
                showExtractedText={showExtractedText}
                setShowExtractedText={setShowExtractedText}
                sourceInfo={extractionSource}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
