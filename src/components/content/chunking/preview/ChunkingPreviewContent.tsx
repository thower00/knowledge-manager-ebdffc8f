
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

  if (isLoading) {
    return <CardContent><LoadingState /></CardContent>;
  }

  if (error) {
    return (
      <CardContent>
        <ErrorState 
          message="Error Loading Document"
          description={error.message || "Could not load document chunks for preview."}
          onRetry={() => window.location.reload()}
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
