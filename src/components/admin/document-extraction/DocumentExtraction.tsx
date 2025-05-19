
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { DocumentSelector } from "./DocumentSelector";
import { ExtractionProgress } from "./ExtractionProgress";
import { ExtractionError } from "./ExtractionError";
import { ExtractedTextDisplay } from "./ExtractedTextDisplay";
import { useDocumentExtraction } from "./hooks/useDocumentExtraction";

export function DocumentExtraction() {
  const {
    documents,
    isLoading,
    selectedDocumentId,
    setSelectedDocumentId,
    extractTextFromDocument,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
  } = useDocumentExtraction();

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF to Text Extraction</CardTitle>
        <CardDescription>
          Extract text content from uploaded PDF documents using PDF.js and a server-side proxy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DocumentSelector
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          setSelectedDocumentId={setSelectedDocumentId}
          isLoading={isLoading}
        />

        <Button
          onClick={() => extractTextFromDocument(selectedDocumentId)}
          disabled={!selectedDocumentId || isExtracting}
          className="w-full sm:w-auto"
        >
          {isExtracting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Extract Text
            </>
          )}
        </Button>

        <ExtractionProgress
          isExtracting={isExtracting}
          extractionProgress={extractionProgress}
        />

        <ExtractionError error={error} />

        <ExtractedTextDisplay extractedText={extractedText} />
      </CardContent>
    </Card>
  );
}
