
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

interface ChunkingPreviewFooterProps {
  onClose: () => void;
}

export function ChunkingPreviewFooter({ onClose }: ChunkingPreviewFooterProps) {
  return (
    <CardFooter className="flex justify-between">
      <div className="text-sm text-muted-foreground">
        Click on a chunk to view its metadata
      </div>
      <Button variant="outline" onClick={onClose}>Close Preview</Button>
    </CardFooter>
  );
}
