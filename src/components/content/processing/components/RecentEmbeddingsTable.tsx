
import React from "react";
import { Badge } from "@/components/ui/badge";
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

interface RecentEmbeddingsTableProps {
  embeddings: EmbeddingRecord[];
  isLoading: boolean;
  onDeleteDocument: (documentId: string) => void;
}

export function RecentEmbeddingsTable({ embeddings, isLoading, onDeleteDocument }: RecentEmbeddingsTableProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading embeddings...</div>;
  }

  if (embeddings.length === 0) {
    return <div className="text-sm text-muted-foreground">No embeddings found.</div>;
  }

  // Get unique documents from embeddings
  const uniqueDocuments = embeddings.reduce((acc, embedding) => {
    if (!acc.find(doc => doc.document_id === embedding.document_id)) {
      acc.push({
        document_id: embedding.document_id,
        count: embeddings.filter(e => e.document_id === embedding.document_id).length
      });
    }
    return acc;
  }, [] as Array<{ document_id: string; count: number }>);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Recent Embeddings (Last 50):</h4>
        {uniqueDocuments.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {uniqueDocuments.length} document(s) with embeddings
          </div>
        )}
      </div>
      
      {/* Document-level actions */}
      {uniqueDocuments.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground">Clear by Document:</h5>
          <div className="flex flex-wrap gap-2">
            {uniqueDocuments.map(doc => (
              <Button
                key={doc.document_id}
                variant="outline"
                size="sm"
                onClick={() => onDeleteDocument(doc.document_id)}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Doc {doc.document_id.slice(0, 8)}... ({doc.count})
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-2">Provider</th>
                <th className="text-left p-2">Model</th>
                <th className="text-left p-2">Dimensions</th>
                <th className="text-left p-2">Threshold</th>
                <th className="text-left p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {embeddings.map(embedding => (
                <tr key={embedding.id} className="border-t">
                  <td className="p-2">
                    <Badge variant="secondary" className="text-xs">
                      {embedding.embedding_provider}
                    </Badge>
                  </td>
                  <td className="p-2 truncate max-w-32">{embedding.embedding_model}</td>
                  <td className="p-2">{embedding.vector_dimensions}</td>
                  <td className="p-2">{embedding.similarity_threshold || 'N/A'}</td>
                  <td className="p-2">{new Date(embedding.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
