
import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Settings, Play } from "lucide-react";
import { DocumentSelector } from "./DocumentSelector";
import { useDocumentSelection } from "./hooks/useDocumentSelection";

export function DocumentProcessingTab() {
  const {
    documents,
    selectedDocuments,
    isLoading,
    handleDocumentSelection,
    handleSelectAll,
    refreshDocuments,
  } = useDocumentSelection();

  useEffect(() => {
    console.log("DocumentProcessingTab mounted");
    return () => console.log("DocumentProcessingTab unmounted");
  }, []);

  console.log("DocumentProcessingTab rendering");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Document Processing</span>
          </CardTitle>
          <CardDescription>
            Complete document processing pipeline: extraction, chunking, and embedding generation with vector storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Document Selection</span>
              </h3>
              <DocumentSelector
                documents={documents}
                selectedDocuments={selectedDocuments}
                onSelectDocument={handleDocumentSelection}
                onSelectAll={handleSelectAll}
                onRefresh={refreshDocuments}
                isLoading={isLoading}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Processing Pipeline</span>
              </h3>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Processing pipeline will be implemented here.
                  This will handle: Text Extraction → Chunking → Embeddings → Vector Storage
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Selected documents: {selectedDocuments.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Processing Progress & Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Progress tracking and results display will be implemented here.
              You'll see real-time updates during processing and detailed results afterward.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
