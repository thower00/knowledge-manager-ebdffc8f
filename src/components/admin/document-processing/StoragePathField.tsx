
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StoragePathFieldProps {
  storagePath: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

export function StoragePathField({ storagePath, onChange, isLoading }: StoragePathFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="storagePath">Storage Path</Label>
      <Input
        id="storagePath"
        name="storagePath"
        value={storagePath}
        onChange={onChange}
        placeholder="/data/documents"
        disabled={isLoading}
      />
      <p className="text-sm text-muted-foreground">
        Path where processed documents are stored.
      </p>
    </div>
  );
}
