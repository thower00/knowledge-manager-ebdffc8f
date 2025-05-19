
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
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import * as pdfjsLib from "pdfjs-dist";

// Set worker path - needed for pdf.js to work
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function DocumentExtraction() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
  }, [selectedDocumentId]);

  // Fetch document via proxy service
  const fetchDocumentViaProxy = async (url: string): Promise<ArrayBuffer> => {
    try {
      console.log("Fetching document via proxy:", url);
      setExtractionProgress(15);
      
      const { data, error } = await supabase.functions.invoke("pdf-proxy", {
        body: { url },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(`Proxy service error: ${error.message}`);
      }
      
      if (data?.error) {
        throw new Error(`Proxy service error: ${data.error}`);
      }
      
      // The data should be the binary file
      if (!data) {
        throw new Error("No data received from proxy");
      }
      
      // Convert base64 to array buffer if needed
      if (typeof data === 'string') {
        // Handle base64 encoding if the server returns it that way
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }
      
      // Return the binary data
      return data;
    } catch (error) {
      console.error("Error fetching document via proxy:", error);
      throw error;
    }
  };

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
    setError(null);

    try {
      // Get the selected document to retrieve its URL
      const selectedDocument = documents?.find(doc => doc.id === documentId);
      
      if (!selectedDocument || !selectedDocument.url) {
        throw new Error("Document URL not found");
      }
      
      console.log("Starting extraction for document:", selectedDocument.title);
      console.log("Original document URL:", selectedDocument.url);
      
      // Use the proxy service to fetch the document
      setExtractionProgress(10);
      let pdfData;
      
      try {
        // Attempt to fetch document through our proxy service
        pdfData = await fetchDocumentViaProxy(selectedDocument.url);
        setExtractionProgress(30);
      } catch (proxyError) {
        console.error("Proxy fetch failed:", proxyError);
        throw new Error(`Failed to fetch document through proxy: ${proxyError.message}`);
      }
      
      // Check if this looks like a PDF (starts with %PDF-)
      const firstBytes = new Uint8Array(pdfData.slice(0, 5));
      const isPdfSignature = firstBytes[0] === 0x25 && // %
                             firstBytes[1] === 0x50 && // P
                             firstBytes[2] === 0x44 && // D
                             firstBytes[3] === 0x46 && // F
                             firstBytes[4] === 0x2D;   // -
      
      if (!isPdfSignature) {
        // First few bytes of the response as text for debugging
        const decoder = new TextDecoder();
        const textStart = decoder.decode(pdfData.slice(0, 100));
        throw new Error(`Response is not a valid PDF. Content starts with: ${textStart.substring(0, 30)}...`);
      }
      
      // Load the PDF using pdf.js
      setExtractionProgress(40);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      
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
        } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          errorMessage = "Network error: Unable to connect to the proxy service. Please check your internet connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setExtractedText("");
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
          Extract text content from uploaded PDF documents using PDF.js and a server-side proxy
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

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Extraction Error</AlertTitle>
            <AlertDescription>
              {error}
              {error.includes("proxy") && (
                <p className="mt-2">
                  <strong>Tip:</strong> The server-side proxy encountered an issue 
                  accessing the document. This approach should bypass CORS restrictions,
                  but there might be other access limitations on the document.
                </p>
              )}
            </AlertDescription>
          </Alert>
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
