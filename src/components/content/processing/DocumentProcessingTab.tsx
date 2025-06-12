
import React, { useRef } from "react";
import { ProcessingConfiguration } from "./ProcessingConfiguration";
import { ProcessingPipeline } from "./ProcessingPipeline";
import { ProcessingDebugger } from "./ProcessingDebugger";
import { VectorDatabaseView } from "./VectorDatabaseView";
import { DocumentSelector } from "./DocumentSelector";
import { useDocumentSelection } from "./hooks/useDocumentSelection";

export function DocumentProcessingTab() {
  const { selectedDocuments, documents, isLoading, handleDocumentSelection, handleSelectAll, refreshDocuments } = useDocumentSelection();
  const processingDebuggerRef = useRef<{ onStatusSyncComplete: () => void }>(null);

  // Function to handle status sync completion from ProcessingDebugger
  const handleStatusSyncComplete = () => {
    console.log("Status sync completed - refreshing document selection with fresh data");
    // Force fresh refresh of documents after status sync
    refreshDocuments(true);
  };

  return (
    <div className="space-y-6">
      <ProcessingConfiguration />
      
      <DocumentSelector
        documents={documents}
        selectedDocuments={selectedDocuments}
        onSelectDocument={handleDocumentSelection}
        onSelectAll={handleSelectAll}
        onRefresh={() => refreshDocuments(true)}
        isLoading={isLoading}
      />
      
      <ProcessingDebugger 
        ref={processingDebuggerRef}
        onStatusSyncComplete={handleStatusSyncComplete}
      />
      
      <ProcessingPipeline 
        selectedDocuments={selectedDocuments} 
        documents={documents}
      />
      
      <VectorDatabaseView />
    </div>
  );
}
