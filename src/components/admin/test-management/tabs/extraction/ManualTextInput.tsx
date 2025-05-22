
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ManualTextInputProps {
  extractionText: string;
  setExtractionText: (text: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export const ManualTextInput = ({
  extractionText,
  setExtractionText,
  isDisabled = false,
  placeholder = "Paste document content to test extraction..."
}: ManualTextInputProps) => {
  // Create a separate value for the textarea that's not tied to extraction results
  // This prevents the extraction results from showing in this input
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExtractionText(e.target.value);
  };
  
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Or paste document text for extraction test</Label>
        <Textarea
          value={isDisabled ? "" : extractionText}
          onChange={handleChange}
          placeholder={placeholder}
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
