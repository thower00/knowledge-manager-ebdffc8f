
import React from "react";
import { Badge } from "@/components/ui/badge";

interface VectorStats {
  total_embeddings: number;
  unique_documents: number;
  providers: string[];
  models: string[];
}

interface VectorStatsProps {
  stats: VectorStats | null;
  isLoading: boolean;
}

export function VectorStats({ stats, isLoading }: VectorStatsProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-sm text-muted-foreground">No statistics available.</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="space-y-2">
        <div className="text-2xl font-bold">{stats.total_embeddings}</div>
        <div className="text-xs text-muted-foreground">Total Embeddings</div>
      </div>
      
      <div className="space-y-2">
        <div className="text-2xl font-bold">{stats.unique_documents}</div>
        <div className="text-xs text-muted-foreground">Documents</div>
      </div>
      
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {stats.providers.map(provider => (
            <Badge key={provider} variant="outline" className="text-xs">
              {provider}
            </Badge>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">Providers</div>
      </div>
      
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {stats.models.slice(0, 2).map(model => (
            <Badge key={model} variant="secondary" className="text-xs">
              {model.length > 10 ? `${model.slice(0, 10)}...` : model}
            </Badge>
          ))}
          {stats.models.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{stats.models.length - 2} more
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">Models</div>
      </div>
    </div>
  );
}
