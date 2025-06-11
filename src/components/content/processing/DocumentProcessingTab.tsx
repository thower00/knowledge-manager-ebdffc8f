
import React from "react";
import { ProcessingConfiguration } from "./ProcessingConfiguration";
import { ProcessingPipeline } from "./ProcessingPipeline";
import { ProcessingDebugger } from "./ProcessingDebugger";
import { VectorDatabaseView } from "./VectorDatabaseView";
import { DocumentSelector } from "./DocumentSelector";
import { useDocumentSelection } from "./hooks/useDocumentSelection";

export function DocumentProcessingTab() {
  const { selectedDocuments, documents, isLoading, handleDocumentSelection, handleSelectAll, refreshDocuments } = useDocumentSelection();

  return (
    <div className="space-y-6">
      <ProcessingConfiguration />
      
      <DocumentSelector
        documents={documents}
        selectedDocuments={selectedDocuments}
        onSelectDocument={handleDocumentSelection}
        onSelectAll={handleSelectAll}
        onRefresh={refreshDocuments}
        isLoading={isLoading}
      />
      
      <ProcessingDebugger />
      
      <ProcessingPipeline 
        selectedDocuments={selectedDocuments} 
        documents={documents}
      />
      
      <VectorDatabaseView />
    </div>
  );
}
