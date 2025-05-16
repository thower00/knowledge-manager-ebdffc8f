
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { DocumentSourceConfig } from "@/types/document";
import { fetchSourceConfig } from "./utils/configService";
import { DocumentSourceSelector } from "./DocumentSourceSelector";
import { DocumentActions } from "./DocumentActions";
import { DocumentList } from "./DocumentList";
import { ProcessedDocumentsList } from "./ProcessedDocumentsList";
import { useDocuments } from "./hooks/useDocuments";

export function DocumentsTab() {
  const [documentSource, setDocumentSource] = useState<string>("google-drive");
  const [sourceConfig, setSourceConfig] = useState<DocumentSourceConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const { toast } = useToast();
  
  const { 
    documents, 
    selectedDocuments, 
    isLoading,
    isUploading,
    fetchDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    uploadDocuments
  } = useDocuments(documentSource, sourceConfig, () => {
    // Callback when upload completes to refresh the processed documents list
    setTimeout(() => {
      console.log("Triggering refresh of processed documents list");
      setRefreshKey(prev => prev + 1);
    }, 2000);
  });

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
        {/* Use the key to force re-render when refreshKey changes */}
        <ProcessedDocumentsList key={refreshKey} />
      </div>
    </div>
  );
}
