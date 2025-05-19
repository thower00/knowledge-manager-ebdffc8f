
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DocumentChunk } from "@/types/chunking";

interface ChunkCardProps {
  chunk: DocumentChunk;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

export function ChunkCard({ chunk, index, isActive, onClick }: ChunkCardProps) {
  return (
    <div 
      className={`p-3 border rounded-md transition-colors ${isActive ? 'bg-accent/20' : 'hover:bg-accent/10'}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <Badge variant="outline">Chunk {index + 1}</Badge>
        <span className="text-xs text-muted-foreground">{chunk.content.length} chars</span>
      </div>
      <p className="text-sm">{chunk.content}</p>
      
      {isActive && (
        <div className="mt-3 pt-3 border-t text-xs">
          <h4 className="font-medium mb-1">Metadata:</h4>
          <pre className="bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(chunk.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
