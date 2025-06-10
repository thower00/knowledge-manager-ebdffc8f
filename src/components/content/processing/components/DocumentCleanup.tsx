
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface EmbeddingRecord {
  id: string;
  document_id: string;
  chunk_id: string;
  embedding_model: string;
  embedding_provider: string;
  similarity_threshold: number | null;
  created_at: string;
  vector_dimensions: number;
}

interface DocumentCleanupProps {
  embeddings: EmbeddingRecord[];
  onClearDocument: (documentId: string) => void;
  isClearing: boolean;
}

export function DocumentCleanup({ embeddings, onClearDocument, isClearing }: DocumentCleanupProps) {
  const uniqueDocuments = [...new Set(embeddings.map(e => e.document_id))];

  if (uniqueDocuments.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Clear Embeddings by Document:</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {uniqueDocuments.slice(0, 10).map(docId => {
          const docEmbeddings = embeddings.filter(e => e.document_id === docId);
          return (
            <div key={docId} className="flex items-center justify-between p-2 border rounded">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono truncate">{docId}</div>
                <div className="text-xs text-muted-foreground">
                  {docEmbeddings.length} embeddings
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onClearDocument(docId)}
                disabled={isClearing}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
