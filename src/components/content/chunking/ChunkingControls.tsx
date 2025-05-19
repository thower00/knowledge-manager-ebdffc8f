
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ChunkingConfig } from "@/types/chunking";

interface ChunkingControlsProps {
  config: ChunkingConfig;
  onChange: (config: Partial<ChunkingConfig>) => void;
  onProcess: () => void;
  selectedCount: number;
  isProcessing: boolean;
}

export function ChunkingControls({
  config,
  onChange,
  onProcess,
  selectedCount,
  isProcessing,
}: ChunkingControlsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chunkSize">Chunk Size</Label>
              <Input
                id="chunkSize"
                type="number"
                value={config.chunkSize}
                onChange={(e) => onChange({ chunkSize: parseInt(e.target.value) || 1000 })}
                min={100}
                max={10000}
              />
              <p className="text-xs text-muted-foreground">
                Maximum characters per chunk
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
              <Input
                id="chunkOverlap"
                type="number"
                value={config.chunkOverlap}
                onChange={(e) => onChange({ chunkOverlap: parseInt(e.target.value) || 0 })}
                min={0}
                max={Math.floor(config.chunkSize / 2)}
              />
              <p className="text-xs text-muted-foreground">
                Characters to repeat between chunks
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Chunking Strategy</Label>
            <RadioGroup
              value={config.chunkStrategy}
              onValueChange={(value) => onChange({ chunkStrategy: value as ChunkingConfig["chunkStrategy"] })}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed_size" id="fixed_size" />
                <Label htmlFor="fixed_size" className="cursor-pointer">Fixed Size</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paragraph" id="paragraph" />
                <Label htmlFor="paragraph" className="cursor-pointer">Paragraph</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sentence" id="sentence" />
                <Label htmlFor="sentence" className="cursor-pointer">Sentence</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recursive" id="recursive" />
                <Label htmlFor="recursive" className="cursor-pointer">Recursive</Label>
              </div>
            </RadioGroup>
          </div>
          
          <Button 
            className="w-full mt-4" 
            onClick={onProcess} 
            disabled={selectedCount === 0 || isProcessing}
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Scissors className="mr-2 h-4 w-4" />
                Process {selectedCount} Document{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
