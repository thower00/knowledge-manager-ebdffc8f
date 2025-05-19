
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";
import { Progress } from "@/components/ui/progress";
import * as pdfjsLib from "pdfjs-dist";

// Set worker path - needed for pdf.js to work
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function DocumentExtraction() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const { toast } = useToast();

  // Fetch processed documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ["processed-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processed_documents")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      
      return data as ProcessedDocument[];
    },
  });

  // Reset progress when selecting a new document
  useEffect(() => {
    setExtractionProgress(0);
    setExtractedText("");
  }, [selectedDocumentId]);

  // Function to extract text from a PDF document using pdf.js
  const extractTextFromDocument = async (documentId: string) => {
    if (!documentId) {
      toast({
        title: "No document selected",
        description: "Please select a document to extract text from",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    setExtractedText("");
    setExtractionProgress(0);

    try {
      // Get the selected document to retrieve its URL
      const selectedDocument = documents?.find(doc => doc.id === documentId);
      
      if (!selectedDocument || !selectedDocument.url) {
        throw new Error("Document URL not found");
      }
      
      console.log("Starting extraction for document:", selectedDocument.title);
      console.log("Document URL:", selectedDocument.url);
      
      // For Google Drive URLs, we need to transform the URL
      // From: https://drive.google.com/file/d/FILEID/view?usp=drivesdk
      // To: https://drive.google.com/uc?export=download&id=FILEID
      let documentUrl = selectedDocument.url;
      if (documentUrl.includes('drive.google.com/file/d/')) {
        const fileId = documentUrl.split('/d/')[1].split('/')[0];
        documentUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
      
      // Fetch the document as an array buffer
      setExtractionProgress(10);
      const response = await fetch(documentUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }
      
      setExtractionProgress(30);
      const arrayBuffer = await response.arrayBuffer();
      
      // Load the PDF using pdf.js
      setExtractionProgress(40);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let extractedContent = `PDF document loaded. Total pages: ${pdf.numPages}\n\n`;
      
      // Extract text from each page
      const totalPages = pdf.numPages;
      let pageTexts: string[] = [];
      
      for (let i = 1; i <= totalPages; i++) {
        setExtractionProgress(40 + Math.floor((i / totalPages) * 50));
        
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        pageTexts.push(`--- Page ${i} ---\n${pageText}\n`);
      }
      
      extractedContent += pageTexts.join('\n');
      setExtractionProgress(95);
      
      setTimeout(() => {
        setExtractedText(extractedContent);
        setExtractionProgress(100);
        toast({
          title: "Text extraction completed",
          description: `Successfully extracted text from "${selectedDocument.title}"`,
        });
      }, 500);
      
    } catch (error) {
      console.error("Error extracting text:", error);
      
      let errorMessage = "Failed to extract text from the document";
      if (error instanceof Error) {
        // Special handling for common PDF.js errors
        if (error.message.includes("Invalid PDF structure")) {
          errorMessage = "The file is not a valid PDF document.";
        } else if (error.message.includes("Unexpected server response")) {
          errorMessage = "Cannot access the document. This might be due to CORS restrictions or the file is not directly downloadable.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setExtractedText(`Error: ${errorMessage}`);
      toast({
        title: "Extraction failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF to Text Extraction</CardTitle>
        <CardDescription>
          Extract text content from uploaded PDF documents using PDF.js
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="document-select">Select Document</Label>
          <Select
            value={selectedDocumentId}
            onValueChange={setSelectedDocumentId}
          >
            <SelectTrigger id="document-select" className="w-full">
              <SelectValue placeholder="Select a document" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>
                  Loading documents...
                </SelectItem>
              ) : documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-docs" disabled>
                  No documents available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

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

        {(isExtracting || extractionProgress > 0) && (
          <div className="space-y-2">
            <Label>Extraction Progress</Label>
            <Progress value={extractionProgress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {extractionProgress}% complete
            </p>
          </div>
        )}

        {extractedText && (
          <div className="mt-6 space-y-2">
            <Label>Extracted Text</Label>
            <div className="bg-gray-50 p-4 rounded-md border">
              <pre className="whitespace-pre-wrap font-mono text-sm overflow-auto max-h-96">
                {extractedText}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
