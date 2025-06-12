
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { DocumentSourceConfig } from "@/types/document";
import { fetchSourceConfig } from "./utils/configService";
import { syncDocumentStatuses } from "./utils/statusSyncService";
import { DocumentSourceSelector } from "./DocumentSourceSelector";
import { DocumentActions } from "./DocumentActions";
import { DocumentList } from "./DocumentList";
import { ProcessedDocumentsList } from "./ProcessedDocumentsList";
import { useDocuments } from "./hooks/useDocuments";

export function DocumentsTab() {
  const [documentSource, setDocumentSource] = useState<string>("google-drive");
  const [sourceConfig, setSourceConfig] = useState<DocumentSourceConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
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
    console.log("Upload success callback triggered");
    setRefreshKey(prev => prev + 1);
  });

  // Auto-sync document statuses on component mount
  useEffect(() => {
    const performInitialSync = async () => {
      setIsSyncing(true);
      try {
        const result = await syncDocumentStatuses();
        if (result.updated > 0) {
          console.log(`Auto-synced ${result.updated} document statuses on mount`);
          setRefreshKey(prev => prev + 1);
        }
      } catch (error) {
        console.error("Error during initial status sync:", error);
      } finally {
        setIsSyncing(false);
      }
    };

    performInitialSync();
  }, []);

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

  const handleRefresh = async () => {
    // Sync statuses before refreshing
    setIsSyncing(true);
    try {
      const result = await syncDocumentStatuses();
      if (result.updated > 0) {
        toast({
          title: "Status Sync",
          description: `Updated status for ${result.updated} documents`,
        });
      }
    } catch (error) {
      console.error("Error syncing statuses:", error);
    } finally {
      setIsSyncing(false);
    }
    
    // Then refresh documents
    await fetchDocuments();
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DocumentSourceSelector 
              documentSource={documentSource}
              onChange={setDocumentSource}
              disabled={isLoading || isSyncing}
            />
            
            <DocumentActions
              onRefresh={handleRefresh}
              onProcess={async () => {
                await uploadDocuments();
                setTimeout(() => {
                  setRefreshKey(prev => prev + 1);
                }, 500);
              }}
              isLoading={isLoading || isSyncing}
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
        isLoading={isLoading || isSyncing}
        toggleSelection={toggleDocumentSelection}
        toggleSelectAll={toggleSelectAll}
      />
      
      <div className="mt-6">
        <h2 className="text-lg font-medium mb-4">Database Documents</h2>
        <ProcessedDocumentsList key={refreshKey} />
      </div>
    </div>
  );
}
