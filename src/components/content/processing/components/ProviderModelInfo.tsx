
import React from "react";
import { Badge } from "@/components/ui/badge";

interface VectorStats {
  total_embeddings: number;
  unique_documents: number;
  providers: string[];
  models: string[];
}

interface ProviderModelInfoProps {
  stats: VectorStats | null;
}

export function ProviderModelInfo({ stats }: ProviderModelInfoProps) {
  if (!stats) return null;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium mb-2">Active Providers:</h4>
        <div className="flex flex-wrap gap-2">
          {stats.providers.map(provider => (
            <Badge key={provider} variant="secondary">
              {provider}
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2">Models in Use:</h4>
        <div className="flex flex-wrap gap-2">
          {stats.models.map(model => (
            <Badge key={model} variant="outline">
              {model}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
