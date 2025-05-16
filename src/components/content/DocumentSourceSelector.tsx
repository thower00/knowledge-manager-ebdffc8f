
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocumentSourceSelectorProps {
  documentSource: string;
  onChange: (source: string) => void;
  disabled?: boolean;
}

export function DocumentSourceSelector({
  documentSource,
  onChange,
  disabled = false
}: DocumentSourceSelectorProps) {
  return (
    <div className="w-full sm:w-64">
      <Select 
        value={documentSource} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Document Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="google-drive">Google Drive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
