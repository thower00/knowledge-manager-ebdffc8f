
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import { ChunkingConfig } from "@/types/chunking";

interface ChunkingPreviewHeaderProps {
  config: ChunkingConfig;
  onClose: () => void;
}

export function ChunkingPreviewHeader({ config, onClose }: ChunkingPreviewHeaderProps) {
  return (
    <CardHeader className="pb-2">
      <div className="flex justify-between items-center">
        <CardTitle className="text-xl">Chunking Preview</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Strategy: {config.chunkStrategy.replace('_', ' ')}</span>
        <Separator orientation="vertical" className="h-4" />
        <span>Size: {config.chunkSize}</span>
        <Separator orientation="vertical" className="h-4" />
        <span>Overlap: {config.chunkOverlap}</span>
      </div>
    </CardHeader>
  );
}
