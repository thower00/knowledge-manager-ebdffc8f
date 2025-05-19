
import { Card } from "@/components/ui/card";
import { ChunkingConfig } from "@/types/chunking";
import { ChunkingPreviewHeader } from "./preview/ChunkingPreviewHeader";
import { ChunkingPreviewContent } from "./preview/ChunkingPreviewContent";
import { ChunkingPreviewFooter } from "./preview/ChunkingPreviewFooter";

interface ChunkingPreviewProps {
  documentId: string;
  config: ChunkingConfig;
  onClose: () => void;
}

export function ChunkingPreview({
  documentId,
  config,
  onClose,
}: ChunkingPreviewProps) {
  return (
    <Card className="relative">
      <ChunkingPreviewHeader config={config} onClose={onClose} />
      <ChunkingPreviewContent documentId={documentId} config={config} />
      <ChunkingPreviewFooter onClose={onClose} />
    </Card>
  );
}
