
import React from "react";

interface VectorStats {
  total_embeddings: number;
  unique_documents: number;
  providers: string[];
  models: string[];
}

interface VectorStatsProps {
  stats: VectorStats | null;
}

export function VectorStats({ stats }: VectorStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-3 border rounded-lg bg-muted/50">
        <div className="text-2xl font-bold">{stats.total_embeddings}</div>
        <div className="text-sm text-muted-foreground">Total Embeddings</div>
      </div>
      <div className="p-3 border rounded-lg bg-muted/50">
        <div className="text-2xl font-bold">{stats.unique_documents}</div>
        <div className="text-sm text-muted-foreground">Documents</div>
      </div>
      <div className="p-3 border rounded-lg bg-muted/50">
        <div className="text-2xl font-bold">{stats.providers.length}</div>
        <div className="text-sm text-muted-foreground">Providers</div>
      </div>
      <div className="p-3 border rounded-lg bg-muted/50">
        <div className="text-2xl font-bold">{stats.models.length}</div>
        <div className="text-sm text-muted-foreground">Models</div>
      </div>
    </div>
  );
}
