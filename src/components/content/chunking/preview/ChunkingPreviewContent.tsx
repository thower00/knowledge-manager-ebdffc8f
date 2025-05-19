
import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { DocumentInfoPanel } from "./DocumentInfoPanel";
import { ChunksList } from "./ChunksList";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { ChunkingConfig } from "@/types/chunking";
import { useDocumentContent } from "./hooks/useDocumentContent";
import { useChunkGenerator } from "./hooks/useChunkGenerator";

interface ChunkingPreviewContentProps {
  documentId: string;
  config: ChunkingConfig;
}

export function ChunkingPreviewContent({ documentId, config }: ChunkingPreviewContentProps) {
  const { document, isLoading: isLoadingDocument, error: documentError, viewFullDocument } = useDocumentContent(documentId);
  const { chunks, isLoading: isLoadingChunks, error: chunksError } = useChunkGenerator(documentId, config, document?.content);
  
  // Determine loading and error states
  const isLoading = isLoadingDocument || isLoadingChunks;
  const error = documentError || chunksError;

  // Function to reload the page when retry is clicked
  const handleRetry = () => {
    window.location.reload();
  };

  if (isLoading) {
    return <CardContent><LoadingState message={isLoadingDocument ? "Loading document..." : "Generating chunks..."} /></CardContent>;
  }

  if (error) {
    return (
      <CardContent>
        <ErrorState 
          message={documentError ? "Error Loading Document" : "Error Generating Chunks"}
          description={error.message || "Could not load document chunks for preview."}
          onRetry={handleRetry}
        />
      </CardContent>
    );
  }

  if (!document?.content) {
    return (
      <CardContent>
        <ErrorState 
          message="Document Content Unavailable"
          description="The document content could not be retrieved. It may not be stored in the database."
          onRetry={handleRetry}
        />
      </CardContent>
    );
  }

  return (
    <CardContent>
      <div className="space-y-4">
        <DocumentInfoPanel 
          document={document}
          chunksCount={chunks.length}
          onViewFullDocument={viewFullDocument}
        />
        
        <ChunksList chunks={chunks} />
      </div>
    </CardContent>
  );
}
