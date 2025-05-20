
import { Card, CardContent } from "@/components/ui/card";
import { DocumentChunk } from "@/types/chunking";

interface ChunkCardProps {
  chunk: DocumentChunk;
  index: number;
}

export function ChunkCard({ chunk, index }: ChunkCardProps) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3 text-sm text-muted-foreground">
          <span className="font-semibold">Chunk #{index + 1}</span>
          <span className="text-xs">{chunk.content.length} characters</span>
        </div>
        
        <div className="text-sm bg-muted/30 p-3 rounded-md max-h-40 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans">
            {chunk.content}
          </pre>
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-1">
            {Object.entries(chunk.metadata).map(([key, value]) => (
              key !== 'index' && (
                <span key={key} className="bg-muted px-2 py-1 rounded-sm">
                  {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              )
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
