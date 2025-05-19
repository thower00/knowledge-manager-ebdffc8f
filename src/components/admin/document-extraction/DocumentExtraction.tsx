
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
import { DocumentMetadata, ProcessedDocument } from "@/types/document";
import { Progress } from "@/components/ui/progress";

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

  // Function to extract text from a PDF document
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
      
      // Simulating progress updates
      const progressInterval = setInterval(() => {
        setExtractionProgress(prev => {
          const newProgress = Math.min(prev + 10, 90);
          return newProgress;
        });
      }, 500);
      
      // Fetch the document and extract text
      // In a real implementation, we would use a PDF parsing library or service
      const response = await fetch(selectedDocument.url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }
      
      // Get document as blob
      const pdfBlob = await response.blob();
      
      // Create a FormData object to send the file to an extraction service
      const formData = new FormData();
      formData.append('file', pdfBlob, selectedDocument.title);
      
      // For now, we're using a simple text extraction from the blob
      // In a production environment, you would send this to a PDF parsing service
      const text = await extractTextFromBlob(pdfBlob);
      
      clearInterval(progressInterval);
      setExtractionProgress(100);
      
      setTimeout(() => {
        setExtractedText(text);
        toast({
          title: "Text extraction completed",
          description: "Successfully extracted text from the document",
        });
      }, 500);
      
    } catch (error) {
      console.error("Error extracting text:", error);
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Function to extract text from a blob (PDF)
  const extractTextFromBlob = async (blob: Blob): Promise<string> => {
    try {
      // For demonstration, we'll return the first few bytes as text
      // In a real implementation, you would use a PDF parsing library
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Check if this is a PDF by looking at the magic number
      const isPdf = bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70;
      
      if (!isPdf) {
        return "This does not appear to be a PDF file. The file starts with: " + 
          String.fromCharCode.apply(null, Array.from(bytes.slice(0, 20)));
      }
      
      // Extract basic info about the PDF
      let infoText = "PDF Document detected\n\n";
      infoText += "File size: " + (blob.size / 1024).toFixed(2) + " KB\n";
      infoText += "MIME type: " + blob.type + "\n\n";
      
      // In a real implementation, we would use a library like pdf.js to extract text
      infoText += "This is the binary content preview of the PDF file (first 100 bytes):\n";
      
      // Format first bytes as hex for debugging
      const hexBytes = Array.from(bytes.slice(0, 100))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
        
      infoText += hexBytes + "\n\n";
      infoText += "Note: For proper PDF text extraction, you would need to integrate a library like pdf.js or use a server-side PDF parsing service.";
      
      return infoText;
    } catch (error) {
      console.error("Error in extractTextFromBlob:", error);
      return "Error extracting text from document: " + (error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF to Text Extraction</CardTitle>
        <CardDescription>
          Extract text content from uploaded PDF documents
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

        {isExtracting && (
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
