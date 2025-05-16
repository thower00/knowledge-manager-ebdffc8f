
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CustomConfigFieldProps {
  customConfiguration: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
}

export function CustomConfigField({ customConfiguration, onChange, isLoading }: CustomConfigFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="customConfiguration">Custom Configuration (JSON)</Label>
      <Textarea
        id="customConfiguration"
        name="customConfiguration"
        value={customConfiguration}
        onChange={onChange}
        placeholder="Enter custom JSON configuration"
        rows={5}
        className="font-mono"
        disabled={isLoading}
      />
      <p className="text-sm text-muted-foreground">
        Additional configuration in JSON format.
      </p>
    </div>
  );
}
