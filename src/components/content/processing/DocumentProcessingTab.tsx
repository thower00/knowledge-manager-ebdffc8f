
import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Settings, Database } from "lucide-react";
import { DocumentSelector } from "./DocumentSelector";
import { ProcessingConfiguration } from "./ProcessingConfiguration";
import { ProcessingPipeline } from "./ProcessingPipeline";
import { VectorDatabaseView } from "./VectorDatabaseView";
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
          </div>
        </CardContent>
      </Card>
      
      {/* Processing Pipeline */}
      <ProcessingPipeline 
        selectedDocuments={selectedDocuments}
        documents={documents}
      />
      
      {/* Vector Database Verification */}
      <VectorDatabaseView />
      
      {/* Processing Configuration */}
      <ProcessingConfiguration />
    </div>
  );
}
