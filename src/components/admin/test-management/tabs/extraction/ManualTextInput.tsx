
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ManualTextInputProps {
  extractionText: string;
  setExtractionText: (text: string) => void;
  isDisabled?: boolean;
}

export const ManualTextInput = ({
  extractionText,
  setExtractionText,
  isDisabled = false
}: ManualTextInputProps) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Or paste document text for extraction test</Label>
        <Textarea
          value={extractionText}
          onChange={(e) => setExtractionText(e.target.value)}
          placeholder="Paste document content to test extraction..."
          rows={5}
          disabled={isDisabled}
          className={isDisabled ? "bg-gray-100 cursor-not-allowed" : ""}
        />
        {isDisabled && (
          <p className="text-xs text-muted-foreground">
            Manual text input is disabled during active extraction.
          </p>
        )}
      </div>
    </div>
  );
};
