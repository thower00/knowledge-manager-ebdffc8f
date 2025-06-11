
import React from "react";
import { ProcessingConfiguration } from "./ProcessingConfiguration";
import { ProcessingPipeline } from "./ProcessingPipeline";
import { ProcessingDebugger } from "./ProcessingDebugger";
import { VectorDatabaseView } from "./VectorDatabaseView";
import { useDocumentSelection } from "./hooks/useDocumentSelection";

export function DocumentProcessingTab() {
  const { selectedDocuments, documents, toggleDocumentSelection, toggleSelectAll } = useDocumentSelection();

  return (
    <div className="space-y-6">
      <ProcessingConfiguration />
      
      <ProcessingDebugger />
      
      <ProcessingPipeline 
        selectedDocuments={selectedDocuments} 
        documents={documents}
      />
      
      <VectorDatabaseView />
    </div>
  );
}
