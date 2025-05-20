
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentSelector } from "./DocumentSelector";
import { ChunkingPreview } from "./ChunkingPreview";
import { ChunkingControls } from "./ChunkingControls";
import { ChunkingResults } from "./ChunkingResults";
import { useChunkingDocuments } from "./hooks/useChunkingDocuments";
import { useChunkingConfig } from "./hooks/useChunkingConfig";
import { useChunkingProcessor } from "./hooks/useChunkingProcessor";

export function ChunkingTab() {
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  
  const {
    documents,
    selectedDocuments,
    isLoading,
    handleDocumentSelection,
    handleSelectAll
  } = useChunkingDocuments();
  
  const {
    chunkingConfig,
    handleChunkingConfigChange
  } = useChunkingConfig();
  
  const {
    isProcessing,
    chunkingResults,
    handleProcessChunking
  } = useChunkingProcessor(documents);

  const handlePreviewChunking = (documentId: string) => {
    setPreviewDocument(documentId);
  };

  console.log("ChunkingTab rendering with", documents.length, "documents");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Chunking</CardTitle>
          <CardDescription>
            Break down documents into smaller chunks for better processing and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Documents</h3>
              <DocumentSelector 
                documents={documents}
                selectedDocuments={selectedDocuments}
                onSelectDocument={handleDocumentSelection}
                onSelectAll={handleSelectAll}
                onPreview={handlePreviewChunking}
                isLoading={isLoading}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Chunking Configuration</h3>
              <ChunkingControls 
                config={chunkingConfig}
                onChange={handleChunkingConfigChange}
                onProcess={() => handleProcessChunking(selectedDocuments)}
                selectedCount={selectedDocuments.length}
                isProcessing={isProcessing}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {previewDocument && (
        <ChunkingPreview 
          documentId={previewDocument}
          config={chunkingConfig}
          onClose={() => setPreviewDocument(null)}
        />
      )}
      
      {chunkingResults.length > 0 && (
        <ChunkingResults results={chunkingResults} />
      )}
    </div>
  );
}
