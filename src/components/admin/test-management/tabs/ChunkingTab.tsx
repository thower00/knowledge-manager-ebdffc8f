
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useChunkingConfig } from "@/components/content/chunking/hooks/useChunkingConfig";
import { ChunkingService, ChunkResult } from "@/services/chunking/chunkingService";
import { 
  Scissors, 
  FileText, 
  Settings,
  Download,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { ChunkingConfig } from "@/types/chunking";

interface ChunkingTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
  extractedText?: string;
  extractedFrom?: string;
}

export function ChunkingTab({ isLoading, onRunTest, extractedText, extractedFrom }: ChunkingTabProps) {
  const [isChunking, setIsChunking] = useState(false);
  const [chunkResults, setChunkResults] = useState<ChunkResult[]>([]);
  const [showChunks, setShowChunks] = useState(false);
  const { toast } = useToast();
  
  // Load chunking configuration from Configuration Management
  const { chunkingConfig, handleChunkingConfigChange } = useChunkingConfig();

  const handleRunChunking = async () => {
    if (!extractedText) {
      toast({
        variant: "destructive",
        title: "No Text Available",
        description: "Please extract text from a document in the Extraction tab first"
      });
      return;
    }

    setIsChunking(true);
    
    try {
      console.log("Starting chunking process...");
      console.log(`Text length: ${extractedText.length} characters`);
      console.log(`Chunking config:`, chunkingConfig);
      
      // Use the shared chunking service
      const chunkingService = new ChunkingService(chunkingConfig);
      const chunks = chunkingService.generateDetailedChunks(extractedText);
      
      console.log(`Generated ${chunks.length} chunks`);
      setChunkResults(chunks);
      setShowChunks(true);
      
      const result = {
        status: 'success',
        message: `Successfully created ${chunks.length} chunks`,
        totalChunks: chunks.length,
        averageChunkSize: Math.round(chunks.reduce((sum, chunk) => sum + chunk.size, 0) / chunks.length),
        strategy: chunkingConfig.chunkStrategy,
        config: chunkingConfig,
        chunks: chunks.map(chunk => ({
          index: chunk.index,
          size: chunk.size,
          preview: chunk.content.substring(0, 100) + (chunk.content.length > 100 ? "..." : "")
        }))
      };
      
      onRunTest(result);
      
      toast({
        title: "Chunking Completed",
        description: `Successfully created ${chunks.length} chunks using ${chunkingConfig.chunkStrategy} strategy`
      });
      
    } catch (error) {
      console.error("Chunking failed:", error);
      
      const result = {
        status: 'error',
        message: 'Chunking failed',
        error: error instanceof Error ? error.message : String(error)
      };
      
      onRunTest(result);
      
      toast({
        variant: "destructive",
        title: "Chunking Failed",
        description: result.error
      });
    } finally {
      setIsChunking(false);
    }
  };

  const downloadChunks = () => {
    if (chunkResults.length === 0) return;
    
    const chunksData = chunkResults.map(chunk => ({
      index: chunk.index,
      size: chunk.size,
      startPosition: chunk.startPosition,
      endPosition: chunk.endPosition,
      content: chunk.content
    }));
    
    const blob = new Blob([JSON.stringify(chunksData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chunks-${chunkingConfig.chunkStrategy}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5" />
            <span>Document Chunking Test</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Source Text Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Source Text</h3>
            {extractedText ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Text available from: {extractedFrom || "Previous extraction"}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {extractedText.length} characters
                  </Badge>
                </div>
                <Textarea
                  value={extractedText}
                  readOnly
                  className="min-h-[120px] font-mono text-sm"
                  placeholder="Extracted text will appear here..."
                />
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">
                  No extracted text available. Please run text extraction first in the Extraction tab.
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Chunking Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <h3 className="text-lg font-medium">Chunking Configuration</h3>
              <Badge variant="outline" className="text-xs">From Configuration Management</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chunkSize">Chunk Size</Label>
                <Input
                  id="chunkSize"
                  type="number"
                  value={chunkingConfig.chunkSize}
                  onChange={(e) => handleChunkingConfigChange({ chunkSize: parseInt(e.target.value) || 1000 })}
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
                  value={chunkingConfig.chunkOverlap}
                  onChange={(e) => handleChunkingConfigChange({ chunkOverlap: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={Math.floor(chunkingConfig.chunkSize / 2)}
                />
                <p className="text-xs text-muted-foreground">
                  Characters to repeat between chunks
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Chunking Strategy</Label>
              <RadioGroup
                value={chunkingConfig.chunkStrategy}
                onValueChange={(value) => handleChunkingConfigChange({ chunkStrategy: value as ChunkingConfig["chunkStrategy"] })}
                className="grid grid-cols-2 gap-3"
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
          </div>

          <Separator />

          {/* Test Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Run Chunking Test</h3>
            
            <Button
              onClick={handleRunChunking}
              disabled={!extractedText || isChunking}
              className="w-full"
            >
              {isChunking ? (
                <>
                  <Settings className="h-4 w-4 mr-2 animate-spin" />
                  Processing Chunks...
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4 mr-2" />
                  Create Chunks from Extracted Text
                </>
              )}
            </Button>
          </div>

          {/* Chunking Results */}
          {chunkResults.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Chunking Results</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={downloadChunks}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      onClick={() => setShowChunks(!showChunks)}
                      size="sm"
                      variant="outline"
                    >
                      {showChunks ? 'Hide' : 'Show'} Chunks
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">{chunkResults.length}</div>
                    <div className="text-sm text-muted-foreground">Total Chunks</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {Math.round(chunkResults.reduce((sum, chunk) => sum + chunk.size, 0) / chunkResults.length)}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg. Size</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">{chunkingConfig.chunkStrategy}</div>
                    <div className="text-sm text-muted-foreground">Strategy</div>
                  </div>
                </div>

                {showChunks && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {chunkResults.map((chunk) => (
                      <div key={chunk.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">Chunk {chunk.index + 1}</Badge>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{chunk.size} chars</span>
                            {chunk.startPosition !== undefined && (
                              <span>pos: {chunk.startPosition}-{chunk.endPosition}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-mono bg-muted/50 p-2 rounded max-h-24 overflow-y-auto">
                          {chunk.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
