
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useConfig } from "@/components/admin/document-processing/ConfigContext";
import { EmbeddingService } from "../services/embeddingService";
import { 
  Brain, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  Download,
  Database,
  Zap
} from "lucide-react";

interface EmbeddingsTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
  chunks?: Array<{
    index: number;
    content: string;
    size: number;
    startPosition?: number;
    endPosition?: number;
  }>;
  sourceDocument?: string;
}

interface EmbeddingResult {
  chunkIndex: number;
  embedding: number[];
  metadata: {
    sourceDocument: string;
    chunkSize: number;
    model: string;
    timestamp: string;
    startPosition?: number;
    endPosition?: number;
  };
}

export function EmbeddingsTab({ isLoading, onRunTest, chunks, sourceDocument }: EmbeddingsTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [embeddingResults, setEmbeddingResults] = useState<EmbeddingResult[]>([]);
  const [showEmbeddings, setShowEmbeddings] = useState(false);
  const { toast } = useToast();
  const { config } = useConfig();

  const getDimensionsForModel = (modelId: string): number => {
    const dimensionMap: { [key: string]: number } = {
      "text-embedding-ada-002": 1536,
      "text-embedding-3-small": 1536,
      "text-embedding-3-large": 3072,
      "embed-english-v2.0": 4096,
      "embed-multilingual-v2.0": 768,
      "embed-english-light-v2.0": 1024,
      "sentence-transformers/all-mpnet-base-v2": 768,
      "sentence-transformers/all-MiniLM-L6-v2": 384,
      "sentence-transformers/multi-qa-mpnet-base-dot-v1": 768,
      "local-model": 512
    };
    return dimensionMap[modelId] || 1536;
  };

  const handleGenerateEmbeddings = async () => {
    if (!chunks || chunks.length === 0) {
      toast({
        variant: "destructive",
        title: "No Chunks Available",
        description: "Please generate chunks in the Chunking tab first"
      });
      return;
    }

    // Check for API key - try provider-specific first, then fall back to general apiKey
    const apiKey = config.providerApiKeys[config.provider] || config.apiKey;
    console.log("Checking API key access:");
    console.log("Provider:", config.provider);
    console.log("Provider-specific key exists:", !!config.providerApiKeys[config.provider]);
    console.log("General API key exists:", !!config.apiKey);
    console.log("Final API key exists:", !!apiKey);
    
    if (!apiKey && config.provider !== "local") {
      toast({
        variant: "destructive",
        title: "API Key Missing",
        description: `Please configure your ${config.provider} API key in Configuration Management. Current provider: ${config.provider}`
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log("Starting embedding generation...");
      console.log(`Processing ${chunks.length} chunks with ${config.provider}/${config.specificModelId}`);
      console.log("API key available:", !!apiKey);
      
      const embeddingService = new EmbeddingService(config);
      const batchSize = parseInt(config.embeddingBatchSize) || 10;
      const results: EmbeddingResult[] = [];
      
      // Process chunks in batches
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
        
        // Generate embeddings for the batch
        const batchPromises = batch.map(async (chunk) => {
          const embeddingResponse = await embeddingService.generateEmbedding(chunk.content);
          
          const metadata: EmbeddingResult['metadata'] = {
            sourceDocument: sourceDocument || "Unknown document",
            chunkSize: chunk.size,
            model: `${embeddingResponse.provider}/${embeddingResponse.model}`,
            timestamp: new Date().toISOString()
          };

          // Include optional metadata based on configuration
          if (config.embeddingMetadata.includeChunkIndex && chunk.startPosition !== undefined) {
            metadata.startPosition = chunk.startPosition;
            metadata.endPosition = chunk.endPosition;
          }

          return {
            chunkIndex: chunk.index,
            embedding: embeddingResponse.embedding,
            metadata
          };
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`Generated ${results.length} embeddings`);
      setEmbeddingResults(results);
      setShowEmbeddings(true);
      
      const result = {
        status: 'success',
        message: `Successfully generated ${results.length} embeddings`,
        totalEmbeddings: results.length,
        dimensions: results.length > 0 ? results[0].embedding.length : getDimensionsForModel(config.specificModelId),
        model: `${config.provider}/${config.specificModelId}`,
        batchSize: batchSize,
        vectorStorage: config.vectorStorage,
        config: {
          provider: config.provider,
          model: config.specificModelId,
          dimensions: results.length > 0 ? results[0].embedding.length : getDimensionsForModel(config.specificModelId),
          batchSize: config.embeddingBatchSize,
          similarityThreshold: config.similarityThreshold,
          vectorStorage: config.vectorStorage,
          metadata: config.embeddingMetadata
        },
        embeddings: results.map(result => ({
          chunkIndex: result.chunkIndex,
          dimensions: result.embedding.length,
          metadata: result.metadata,
          embeddingPreview: result.embedding.slice(0, 5).map(v => v.toFixed(4))
        }))
      };
      
      onRunTest(result);
      
      toast({
        title: "Embeddings Generated",
        description: `Successfully created ${results.length} embeddings using ${config.provider}/${config.specificModelId}`
      });
      
    } catch (error) {
      console.error("Embedding generation failed:", error);
      
      const result = {
        status: 'error',
        message: 'Embedding generation failed',
        error: error instanceof Error ? error.message : String(error)
      };
      
      onRunTest(result);
      
      toast({
        variant: "destructive",
        title: "Embedding Generation Failed",
        description: result.error
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadEmbeddings = () => {
    if (embeddingResults.length === 0) return;
    
    const embeddings = {
      metadata: {
        totalEmbeddings: embeddingResults.length,
        model: `${config.provider}/${config.specificModelId}`,
        dimensions: embeddingResults.length > 0 ? embeddingResults[0].embedding.length : getDimensionsForModel(config.specificModelId),
        generatedAt: new Date().toISOString(),
        sourceDocument: sourceDocument,
        configuration: config
      },
      embeddings: embeddingResults
    };
    
    const blob = new Blob([JSON.stringify(embeddings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embeddings-${config.specificModelId}-${Date.now()}.json`;
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
            <Brain className="h-5 w-5" />
            <span>Embedding Generation Test</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Source Chunks Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Source Chunks</h3>
            {chunks && chunks.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Chunks available from: {sourceDocument || "Previous chunking"}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {chunks.length} chunks
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center p-3 border rounded-lg bg-muted/50">
                  <div>
                    <div className="text-lg font-bold">{chunks.length}</div>
                    <div className="text-xs text-muted-foreground">Total Chunks</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {Math.round(chunks.reduce((sum, chunk) => sum + chunk.size, 0) / chunks.length)}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg. Size</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {chunks.reduce((sum, chunk) => sum + chunk.size, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Chars</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">
                  No chunks available. Please run chunking first in the Chunking tab.
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Configuration Display */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <h3 className="text-lg font-medium">Embedding Configuration</h3>
              <Badge variant="outline" className="text-xs">From Configuration Management</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-medium">{config.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">{config.specificModelId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Key:</span>
                  <span className="font-medium">
                    {(config.providerApiKeys[config.provider] || config.apiKey) ? "✓ Configured" : "❌ Missing"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Batch Size:</span>
                  <span className="font-medium">{config.embeddingBatchSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vector Storage:</span>
                  <span className="font-medium">{config.vectorStorage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Similarity Threshold:</span>
                  <span className="font-medium">{config.similarityThreshold}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Test Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Run Embedding Test</h3>
            
            <Button
              onClick={handleGenerateEmbeddings}
              disabled={!chunks || chunks.length === 0 || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Generating Embeddings... ({Math.ceil((chunks?.length || 0) / parseInt(config.embeddingBatchSize))} batches)
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Embeddings from Chunks
                </>
              )}
            </Button>
          </div>

          {/* Embedding Results */}
          {embeddingResults.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Embedding Results</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={downloadEmbeddings}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      onClick={() => setShowEmbeddings(!showEmbeddings)}
                      size="sm"
                      variant="outline"
                    >
                      {showEmbeddings ? 'Hide' : 'Show'} Details
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">{embeddingResults.length}</div>
                    <div className="text-sm text-muted-foreground">Embeddings</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {embeddingResults.length > 0 ? embeddingResults[0].embedding.length : getDimensionsForModel(config.specificModelId)}
                    </div>
                    <div className="text-sm text-muted-foreground">Dimensions</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">{config.vectorStorage}</div>
                    <div className="text-sm text-muted-foreground">Storage</div>
                  </div>
                </div>

                {showEmbeddings && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {embeddingResults.slice(0, 10).map((result) => (
                      <div key={result.chunkIndex} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">Chunk {result.chunkIndex + 1}</Badge>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Database className="h-3 w-3" />
                            <span>{result.embedding.length}D vector</span>
                          </div>
                        </div>
                        <div className="text-xs space-y-1">
                          <div><strong>Source:</strong> {result.metadata.sourceDocument}</div>
                          <div><strong>Model:</strong> {result.metadata.model}</div>
                          <div><strong>Vector Preview:</strong> [{result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]</div>
                        </div>
                      </div>
                    ))}
                    {embeddingResults.length > 10 && (
                      <div className="text-center text-sm text-muted-foreground">
                        ... and {embeddingResults.length - 10} more embeddings
                      </div>
                    )}
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
