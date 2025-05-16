
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChunkSettingsProps {
  chunkSize: string;
  chunkOverlap: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

export function ChunkSettings({ chunkSize, chunkOverlap, onChange, isLoading }: ChunkSettingsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2">
        <Label htmlFor="chunkSize">Chunk Size</Label>
        <Input
          id="chunkSize"
          name="chunkSize"
          value={chunkSize}
          onChange={onChange}
          placeholder="1000"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Size of text chunks for processing.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
        <Input
          id="chunkOverlap"
          name="chunkOverlap"
          value={chunkOverlap}
          onChange={onChange}
          placeholder="200"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Overlap between consecutive chunks.
        </p>
      </div>
    </div>
  );
}
