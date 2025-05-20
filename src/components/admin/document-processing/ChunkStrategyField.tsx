
import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChunkStrategyFieldProps {
  chunkStrategy: string;
  onChange: (name: string, value: string) => void;
  isLoading: boolean;
  defaultStrategy?: string;
}

export function ChunkStrategyField({ 
  chunkStrategy, 
  onChange, 
  isLoading,
  defaultStrategy = "fixed_size"
}: ChunkStrategyFieldProps) {
  const handleStrategyChange = (value: string) => {
    console.log(`Changing chunk strategy to: ${value}`);
    onChange("chunkStrategy", value);
  };

  const resetToDefault = () => {
    handleStrategyChange(defaultStrategy);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-base">Chunking Strategy</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={resetToDefault}
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset to model default: {defaultStrategy}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <RadioGroup
        value={chunkStrategy}
        onValueChange={handleStrategyChange}
        disabled={isLoading}
        className="grid gap-3 pt-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="fixed_size" id="fixed_size" />
          <Label htmlFor="fixed_size" className="font-normal">
            Fixed Size
          </Label>
          {defaultStrategy === "fixed_size" && (
            <span className="text-xs text-muted-foreground ml-2">(Model Default)</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="paragraph" id="paragraph" />
          <Label htmlFor="paragraph" className="font-normal">
            Paragraph
          </Label>
          {defaultStrategy === "paragraph" && (
            <span className="text-xs text-muted-foreground ml-2">(Model Default)</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="sentence" id="sentence" />
          <Label htmlFor="sentence" className="font-normal">
            Sentence
          </Label>
          {defaultStrategy === "sentence" && (
            <span className="text-xs text-muted-foreground ml-2">(Model Default)</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="recursive" id="recursive" />
          <Label htmlFor="recursive" className="font-normal">
            Recursive
          </Label>
          {defaultStrategy === "recursive" && (
            <span className="text-xs text-muted-foreground ml-2">(Model Default)</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="semantic" id="semantic" />
          <Label htmlFor="semantic" className="font-normal">
            Semantic
          </Label>
          {defaultStrategy === "semantic" && (
            <span className="text-xs text-muted-foreground ml-2">(Model Default)</span>
          )}
        </div>
      </RadioGroup>
      <p className="text-sm text-muted-foreground">
        Select the strategy to use when dividing documents into chunks. Model default: <span className="font-semibold">{defaultStrategy}</span>
      </p>
    </div>
  );
}
