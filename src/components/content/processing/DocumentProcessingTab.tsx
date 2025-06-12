
import React, { useRef } from "react";
import { ProcessingConfiguration } from "./ProcessingConfiguration";
import { ProcessingPipeline } from "./ProcessingPipeline";
import { ProcessingDebugger } from "./ProcessingDebugger";
import { VectorDatabaseView } from "./VectorDatabaseView";
import { DocumentSelector } from "./DocumentSelector";
import { useDocumentSelection } from "./hooks/useDocumentSelection";

export function DocumentProcessingTab() {
  const { 
    selectedDocuments, 
    documents, 
    isLoading, 
    handleDocumentSelection, 
    handleSelectAll, 
    refreshDocuments,
    lastRefreshTime 
  } = useDocumentSelection();
  
  const processingDebuggerRef = useRef<{ onStatusSyncComplete: () => void }>(null);

  // Enhanced function to handle status sync completion
  const handleStatusSyncComplete = async () => {
    console.log("Status sync completed - triggering coordinated refresh");
    console.log("Last refresh time before sync completion:", lastRefreshTime);
    
    // Add a small delay to ensure database changes have propagated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Force fresh refresh of documents after status sync
    console.log("Forcing fresh document refresh after sync completion");
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
        onRefresh={() => {
          console.log("DocumentSelector refresh requested");
          refreshDocuments(true);
        }}
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
