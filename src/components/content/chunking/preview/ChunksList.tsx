
import { useState } from "react";
import { DocumentChunk } from "@/types/chunking";
import { ChunkCard } from "./ChunkCard";

interface ChunksListProps {
  chunks: DocumentChunk[];
}

export function ChunksList({ chunks }: ChunksListProps) {
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);

  const handleChunkClick = (index: number) => {
    setActiveChunkIndex(index === activeChunkIndex ? null : index);
  };

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto p-1">
      {chunks.length > 0 ? (
        chunks.map((chunk, index) => (
          <ChunkCard 
            key={chunk.id} 
            chunk={chunk} 
            index={index}
            isActive={activeChunkIndex === index}
            onClick={() => handleChunkClick(index)}
          />
        ))
      ) : (
        <div className="p-6 text-center border rounded-md text-muted-foreground">
          No chunks generated. The document may be empty or the chunking strategy may not be applicable to this document.
        </div>
      )}
    </div>
  );
}
