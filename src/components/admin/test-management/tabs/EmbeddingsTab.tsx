
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Brain } from "lucide-react";
import { EmbeddingService } from "../services/embeddingService";
import { useEmbeddingConfig } from "./embedding/hooks/useEmbeddingConfig";
import { EmbeddingSourceChunks } from "./embedding/EmbeddingSourceChunks";
import { EmbeddingConfigurationDisplay } from "./embedding/EmbeddingConfigurationDisplay";
import { EmbeddingTestControls } from "./embedding/EmbeddingTestControls";
import { EmbeddingResults } from "./embedding/EmbeddingResults";
import { getDimensionsForModel } from "./embedding/utils/embeddingUtils";

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
  const [embeddingResults, setEmbeddingResults] = useState<EmbeddingResult[]>([]);
  const {
    isGenerating,
    setIsGenerating,
    configLoaded,
    loadedConfig,
    getApiKey,
    hasApiKey,
    toast
  } = useEmbeddingConfig();

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
      const embeddingService = new EmbeddingService(loadedConfig);
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
          <EmbeddingSourceChunks chunks={chunks} sourceDocument={sourceDocument} />

          <Separator />

          <EmbeddingConfigurationDisplay 
            configLoaded={configLoaded}
            loadedConfig={loadedConfig}
            hasApiKey={hasApiKey}
          />

          <Separator />

          <EmbeddingTestControls
            chunks={chunks}
            isGenerating={isGenerating}
            configLoaded={configLoaded}
            hasApiKey={hasApiKey}
            loadedConfig={loadedConfig}
            onGenerateEmbeddings={handleGenerateEmbeddings}
          />

          {embeddingResults.length > 0 && (
            <>
              <Separator />
              <EmbeddingResults 
                embeddingResults={embeddingResults}
                loadedConfig={loadedConfig}
                sourceDocument={sourceDocument}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
