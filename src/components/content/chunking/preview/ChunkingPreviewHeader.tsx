
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { X } from "lucide-react";
import { ChunkingConfig } from "@/types/chunking";

interface ChunkingPreviewHeaderProps {
  config: ChunkingConfig;
  onClose: () => void;
}

export function ChunkingPreviewHeader({ config, onClose }: ChunkingPreviewHeaderProps) {
  return (
    <CardHeader className="relative pb-0">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardTitle>Chunking Preview</CardTitle>
      <CardDescription>
        Previewing with size: {config.chunkSize}, overlap: {config.chunkOverlap}, 
        strategy: {config.chunkStrategy}
      </CardDescription>
    </CardHeader>
  );
}
