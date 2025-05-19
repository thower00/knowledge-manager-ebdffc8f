
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

export function DocumentExtraction() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
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

    try {
      // For demo purposes, we're simulating the extraction with a delay
      // In a real implementation, you would call an API endpoint to extract the text
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response - in a real app, this would come from an API
      const selectedDocument = documents?.find(doc => doc.id === documentId);
      
      // Generate some fake text based on the document title for demonstration
      const simulatedText = `Title: ${selectedDocument?.title || "Unknown Document"}\n\n` +
        `This is simulated extracted content from document ID ${documentId}.\n\n` +
        `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed egestas, magna vel efficitur ` +
        `dictum, lectus metus viverra felis, vel dignissim ipsum nisi at magna. Mauris eu nisl vel ` +
        `magna finibus efficitur. Proin accumsan aliquet nibh, vel facilisis massa malesuada vel.\n\n` +
        `Document source: ${selectedDocument?.source_type || "Unknown"}\n` +
        `Mime type: ${selectedDocument?.mime_type || "Unknown"}\n` +
        `Created at: ${new Date(selectedDocument?.created_at || "").toLocaleString()}\n` +
        `Processed at: ${selectedDocument?.processed_at ? new Date(selectedDocument.processed_at).toLocaleString() : "N/A"}\n`;
      
      setExtractedText(simulatedText);
      
      toast({
        title: "Text extraction completed",
        description: "Successfully extracted text from the document",
      });
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
