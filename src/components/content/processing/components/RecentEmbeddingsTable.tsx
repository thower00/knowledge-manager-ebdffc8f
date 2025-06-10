
import React from "react";
import { Badge } from "@/components/ui/badge";

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
}

export function RecentEmbeddingsTable({ embeddings }: RecentEmbeddingsTableProps) {
  if (embeddings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Recent Embeddings (Last 50):</h4>
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
