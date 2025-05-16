
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelSelectorProps {
  embeddingModel: string;
  onChange: (name: string, value: string) => void;
  isLoading: boolean;
}

export function ModelSelector({ embeddingModel, onChange, isLoading }: ModelSelectorProps) {
  const handleChange = (value: string) => {
    onChange("embeddingModel", value);
  };
  
  return (
    <div className="grid gap-2">
      <Label htmlFor="embeddingModel">Embedding Model</Label>
      <Select
        value={embeddingModel}
        onValueChange={handleChange}
        disabled={isLoading}
      >
        <SelectTrigger id="embeddingModel">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="cohere">Cohere</SelectItem>
          <SelectItem value="huggingface">HuggingFace</SelectItem>
          <SelectItem value="local">Local Model</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Model used for creating text embeddings.
      </p>
    </div>
  );
}
