
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { DocumentSourceConfig, DocumentFile } from "@/types/document";
import { DocumentSourceSelector } from "./DocumentSourceSelector";
import { DocumentActions } from "./DocumentActions";
import { DocumentList } from "./DocumentList";
import { ProcessedDocumentsList } from "./ProcessedDocumentsList";
import { fetchSourceConfig, fetchGoogleDriveDocuments, processSelectedDocuments } from "./documentUtils";

export function DocumentsTab() {
  const [documentSource, setDocumentSource] = useState<string>("google-drive");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [sourceConfig, setSourceConfig] = useState<DocumentSourceConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const { toast } = useToast();

  // Make configuration fetching more robust
  useEffect(() => {
    const getSourceConfig = async () => {
      const result = await fetchSourceConfig(documentSource);
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Configuration Error",
          description: result.error,
        });
        setSourceConfig(null);
      } else if (result.config) {
        setSourceConfig(result.config);
      }
    };

    getSourceConfig();
  }, [documentSource, toast]);

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
        
        // Trigger refresh of the processed documents list
        setRefreshKey(prev => prev + 1);
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

  // Callback to manually trigger refresh
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DocumentSourceSelector 
              documentSource={documentSource}
              onChange={setDocumentSource}
              disabled={isLoading}
            />
            
            <DocumentActions
              onRefresh={fetchDocuments}
              onProcess={uploadDocuments}
              isLoading={isLoading}
              isUploading={isUploading}
              selectedCount={selectedDocuments.length}
              disableRefresh={!sourceConfig}
            />
          </div>
        </CardContent>
      </Card>
      
      <DocumentList 
        documents={documents}
        selectedDocuments={selectedDocuments}
        isLoading={isLoading}
        toggleSelection={toggleDocumentSelection}
        toggleSelectAll={toggleSelectAll}
      />
      
      <div className="mt-6">
        <h2 className="text-lg font-medium mb-4">Database Documents</h2>
        <ProcessedDocumentsList key={refreshKey} onRefresh={handleRefresh} />
      </div>
    </div>
  );
}
