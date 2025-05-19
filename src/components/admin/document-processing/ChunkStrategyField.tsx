
import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";

interface ChunkStrategyFieldProps {
  chunkStrategy: string;
  onChange: (name: string, value: string) => void;
  isLoading: boolean;
}

export function ChunkStrategyField({ chunkStrategy, onChange, isLoading }: ChunkStrategyFieldProps) {
  return (
    <div className="grid gap-2">
      <Label className="text-base">Chunking Strategy</Label>
      <RadioGroup
        value={chunkStrategy}
        onValueChange={(value) => onChange("chunkStrategy", value)}
        disabled={isLoading}
        className="grid gap-3 pt-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="fixed_size" id="fixed_size" />
          <Label htmlFor="fixed_size" className="font-normal">
            Fixed Size
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="paragraph" id="paragraph" />
          <Label htmlFor="paragraph" className="font-normal">
            Paragraph
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="sentence" id="sentence" />
          <Label htmlFor="sentence" className="font-normal">
            Sentence
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="recursive" id="recursive" />
          <Label htmlFor="recursive" className="font-normal">
            Recursive
          </Label>
        </div>
      </RadioGroup>
      <p className="text-sm text-muted-foreground">
        Select the strategy to use when dividing documents into chunks.
      </p>
    </div>
  );
}
