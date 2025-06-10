import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useConfig } from "@/components/admin/document-processing/ConfigContext";
import { EmbeddingService } from "../services/embeddingService";
import { supabase } from "@/integrations/supabase/client";
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
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loadedConfig, setLoadedConfig] = useState<any>(null);
  const { toast } = useToast();
  const { config } = useConfig();

  // Load configuration from database
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        console.log("Loading configuration from database...");
        
        const { data: configData, error } = await supabase
          .from("configurations")
          .select("key, value")
          .in("key", ["document_processing"]);

        if (error) {
          console.error("Error loading configuration:", error);
          return;
        }

        if (configData && configData.length > 0) {
          const dbConfig = configData[0]?.value;
          console.log("Loaded configuration from database:", dbConfig);
          setLoadedConfig(dbConfig);
          setConfigLoaded(true);
        } else {
          console.log("No configuration found in database, using context config");
          setLoadedConfig(config);
          setConfigLoaded(true);
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
        setLoadedConfig(config);
        setConfigLoaded(true);
      }
    };

    loadConfiguration();
  }, [config]);

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

  const getApiKey = () => {
    if (!loadedConfig) return "";
    
    // First try provider-specific key, then fall back to general API key
    const providerKey = loadedConfig.providerApiKeys?.[loadedConfig.provider];
    const generalKey = loadedConfig.apiKey;
    
    console.log("Getting API key:");
    console.log("Provider:", loadedConfig.provider);
    console.log("Provider-specific key exists:", !!providerKey);
    console.log("General API key exists:", !!generalKey);
    
    return providerKey || generalKey || "";
  };

  const hasApiKey = () => {
    const apiKey = getApiKey();
    const hasKey = !!apiKey && apiKey.trim().length > 0;
    console.log("hasApiKey check:", hasKey, "API key length:", apiKey?.length || 0);
    return hasKey;
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

    const apiKey = getApiKey();
    console.log("Embedding generation - API key check:");
    console.log("Provider:", loadedConfig?.provider);
    console.log("Provider-specific key exists:", !!loadedConfig?.providerApiKeys?.[loadedConfig?.provider || ""]);
    console.log("General API key exists:", !!loadedConfig?.apiKey);
    console.log("Final API key exists:", !!apiKey);
    console.log("API key length:", apiKey?.length || 0);
    
    if (!apiKey || apiKey.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "API Key Missing",
        description: `Please configure your ${loadedConfig?.provider || "provider"} API key in Configuration Management. Current provider: ${loadedConfig?.provider || "unknown"}`
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log("Starting embedding generation...");
      console.log(`Processing ${chunks.length} chunks with ${loadedConfig?.provider}/${loadedConfig?.specificModelId}`);
      
      // Use the loaded config for the embedding service
      const embeddingService = new EmbeddingService(loadedConfig || config);
      const batchSize = parseInt(loadedConfig?.embeddingBatchSize || "10");
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
          if (loadedConfig?.embeddingMetadata?.includeChunkIndex && chunk.startPosition !== undefined) {
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
        dimensions: results.length > 0 ? results[0].embedding.length : getDimensionsForModel(loadedConfig?.specificModelId || "text-embedding-ada-002"),
        model: `${loadedConfig?.provider}/${loadedConfig?.specificModelId}`,
        batchSize: batchSize,
        vectorStorage: loadedConfig?.vectorStorage,
        config: {
          provider: loadedConfig?.provider,
          model: loadedConfig?.specificModelId,
          dimensions: results.length > 0 ? results[0].embedding.length : getDimensionsForModel(loadedConfig?.specificModelId || "text-embedding-ada-002"),
          batchSize: loadedConfig?.embeddingBatchSize,
          similarityThreshold: loadedConfig?.similarityThreshold,
          vectorStorage: loadedConfig?.vectorStorage,
          metadata: loadedConfig?.embeddingMetadata
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
        description: `Successfully created ${results.length} embeddings using ${loadedConfig?.provider}/${loadedConfig?.specificModelId}`
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
        model: `${loadedConfig?.provider}/${loadedConfig?.specificModelId}`,
        dimensions: embeddingResults.length > 0 ? embeddingResults[0].embedding.length : getDimensionsForModel(loadedConfig?.specificModelId || "text-embedding-ada-002"),
        generatedAt: new Date().toISOString(),
        sourceDocument: sourceDocument,
        configuration: loadedConfig
      },
      embeddings: embeddingResults
    };
    
    const blob = new Blob([JSON.stringify(embeddings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embeddings-${loadedConfig?.specificModelId}-${Date.now()}.json`;
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
              {!configLoaded && <Badge variant="secondary" className="text-xs">Loading...</Badge>}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-medium">{loadedConfig?.provider || "Loading..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">{loadedConfig?.specificModelId || "Loading..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Key:</span>
                  <span className={`font-medium ${hasApiKey() ? 'text-green-600' : 'text-red-600'}`}>
                    {configLoaded ? (hasApiKey() ? "✓ Configured" : "❌ Missing") : "Loading..."}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Batch Size:</span>
                  <span className="font-medium">{loadedConfig?.embeddingBatchSize || "Loading..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vector Storage:</span>
                  <span className="font-medium">{loadedConfig?.vectorStorage || "Loading..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Similarity Threshold:</span>
                  <span className="font-medium">{loadedConfig?.similarityThreshold || "Loading..."}</span>
                </div>
              </div>
            </div>

            {configLoaded && !hasApiKey() && (
              <div className="flex items-center space-x-2 p-3 border border-red-200 rounded-lg bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">
                  Please configure your {loadedConfig?.provider || "provider"} API key in Configuration Management before running embeddings.
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Test Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Run Embedding Test</h3>
            
            <Button
              onClick={handleGenerateEmbeddings}
              disabled={!chunks || chunks.length === 0 || isGenerating || !configLoaded || !hasApiKey()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Generating Embeddings... ({Math.ceil((chunks?.length || 0) / parseInt(loadedConfig?.embeddingBatchSize || "10"))} batches)
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
                      {embeddingResults.length > 0 ? embeddingResults[0].embedding.length : getDimensionsForModel(loadedConfig?.specificModelId || "text-embedding-ada-002")}
                    </div>
                    <div className="text-sm text-muted-foreground">Dimensions</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-2xl font-bold">{loadedConfig?.vectorStorage || "supabase"}</div>
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
