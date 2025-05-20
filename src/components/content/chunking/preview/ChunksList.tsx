
import { DocumentChunk } from "@/types/chunking";
import { ChunkCard } from "./ChunkCard";

interface ChunksListProps {
  chunks: DocumentChunk[];
}

export function ChunksList({ chunks }: ChunksListProps) {
  if (chunks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No chunks generated</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Generated Chunks ({chunks.length})</h3>
      <div className="space-y-2">
        {chunks.map((chunk, index) => (
          <ChunkCard key={chunk.id} chunk={chunk} index={index} />
        ))}
      </div>
    </div>
  );
}
