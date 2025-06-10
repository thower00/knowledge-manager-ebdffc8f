
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmbeddingSourceChunksProps {
  chunks?: Array<{
    index: number;
    content: string;
    size: number;
    startPosition?: number;
    endPosition?: number;
  }>;
  sourceDocument?: string;
}

export function EmbeddingSourceChunks({ chunks, sourceDocument }: EmbeddingSourceChunksProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Source Chunks</h3>
      {chunks && chunks.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Chunks available from: {sourceDocument || "Previous chunking"}
              </span>
            </div>
            <Badge variant="secondary">
              {chunks.length} chunks
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center p-3 border rounded-lg bg-muted/50">
            <div>
              <div className="text-lg font-bold">{chunks.length}</div>
              <div className="text-xs text-muted-foreground">Total Chunks</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {Math.round(chunks.reduce((sum, chunk) => sum + chunk.size, 0) / chunks.length)}
              </div>
              <div className="text-xs text-muted-foreground">Avg. Size</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {chunks.reduce((sum, chunk) => sum + chunk.size, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Chars</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            No chunks available. Please run chunking first in the Chunking tab.
          </span>
        </div>
      )}
    </div>
  );
}
