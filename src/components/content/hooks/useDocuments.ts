
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DocumentSourceConfig, DocumentFile } from "@/types/document";
import { fetchGoogleDriveDocuments } from "../utils/googleDriveService";
import { processSelectedDocuments } from "../documentUtils";

export function useDocuments(
  documentSource: string,
  sourceConfig: DocumentSourceConfig | null,
  onUploadSuccess?: () => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const { toast } = useToast();

  // Function to fetch documents from the selected source
  const fetchDocuments = async () => {
    if (!sourceConfig) {
      toast({
        variant: "destructive",
        title: "Configuration Missing",
        description: `Please configure ${documentSource} integration first in the Configuration Management page.`,
      });
      return;
    }

    setIsLoading(true);
    setDocuments([]);

    try {
      // For Google Drive, call the appropriate edge function
      if (documentSource === "google-drive") {
        const files = await fetchGoogleDriveDocuments(sourceConfig);
        setDocuments(files);
      }
    } catch (err: any) {
      console.error("Error fetching documents:", err);
      toast({
        variant: "destructive",
        title: "Error Fetching Documents",
        description: err.message || "Failed to load documents from source",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle document selection
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  // Toggle select all documents
  const toggleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedDocuments(documents.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  // Upload selected documents
  const uploadDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to upload.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const result = await processSelectedDocuments(documentSource, sourceConfig, selectedDocuments);
      
      if (result.success) {
        toast({
          title: "Documents Processing Started",
          description: result.message,
        });

        // Reset selection
        setSelectedDocuments([]);
        
        // Call the success callback if provided
        if (onUploadSuccess) {
          console.log("Calling onUploadSuccess callback");
          onUploadSuccess();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      console.error("Error processing documents:", err);
      toast({
        variant: "destructive",
        title: "Document Processing Failed",
        description: err.message || "Failed to process selected documents",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return {
    documents,
    selectedDocuments,
    isLoading,
    isUploading,
    fetchDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    uploadDocuments
  };
}
