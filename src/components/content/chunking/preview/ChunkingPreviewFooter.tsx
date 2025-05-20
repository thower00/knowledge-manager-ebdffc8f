
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

interface ChunkingPreviewFooterProps {
  onClose: () => void;
}

export function ChunkingPreviewFooter({ onClose }: ChunkingPreviewFooterProps) {
  return (
    <CardFooter className="flex justify-end">
      <Button variant="outline" onClick={onClose}>
        Close Preview
      </Button>
    </CardFooter>
  );
}
