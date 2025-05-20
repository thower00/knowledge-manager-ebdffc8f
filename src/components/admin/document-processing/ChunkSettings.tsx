
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ModelDefaults {
  chunkSize: string;
  chunkOverlap: string;
  chunkStrategy: string;
}

interface ChunkSettingsProps {
  chunkSize: string;
  chunkOverlap: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  modelDefaults: ModelDefaults;
}

export function ChunkSettings({ 
  chunkSize, 
  chunkOverlap, 
  onChange, 
  isLoading,
  modelDefaults
}: ChunkSettingsProps) {
  const handleReset = (fieldName: string, defaultValue: string) => {
    // Create a synthetic event to pass to the onChange handler
    const syntheticEvent = {
      target: {
        name: fieldName,
        value: defaultValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="chunkSize">Chunk Size</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleReset("chunkSize", modelDefaults.chunkSize)}
                  disabled={isLoading}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset to model default: {modelDefaults.chunkSize}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="chunkSize"
          name="chunkSize"
          value={chunkSize}
          onChange={onChange}
          placeholder={modelDefaults.chunkSize}
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Size of text chunks for processing. Default for selected model: {modelDefaults.chunkSize}
        </p>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleReset("chunkOverlap", modelDefaults.chunkOverlap)}
                  disabled={isLoading}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset to model default: {modelDefaults.chunkOverlap}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="chunkOverlap"
          name="chunkOverlap"
          value={chunkOverlap}
          onChange={onChange}
          placeholder={modelDefaults.chunkOverlap}
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Overlap between consecutive chunks. Default for selected model: {modelDefaults.chunkOverlap}
        </p>
      </div>
    </div>
  );
}
