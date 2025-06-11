
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
import { 
  mapDatabaseConfigToEmbeddingConfig, 
  validateEmbeddingConfig, 
  getConfigurationStatusMessage 
} from "@/utils/embeddingConfigMapper";

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

    if (!configLoaded || !loadedConfig) {
      toast({
        variant: "destructive",
        title: "Configuration Not Loaded",
        description: "Please wait for configuration to load or check Configuration Management"
      });
      return;
    }

    console.log("Starting embedding generation with config:", loadedConfig);

    // Map database config to embedding service format
    const mappedConfig = mapDatabaseConfigToEmbeddingConfig(loadedConfig);
    console.log("Mapped config for EmbeddingService:", mappedConfig);

    // Validate the mapped configuration
    const validation = validateEmbeddingConfig(mappedConfig);
    console.log("Configuration validation result:", validation);

    if (!validation.isValid) {
      const errorMessage = `Configuration is invalid: ${validation.errors.join(', ')}. Please check Configuration Management.`;
      console.error("Configuration validation failed:", validation.errors);
      
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: errorMessage
      });

      onRunTest({
        status: 'error',
        message: 'Configuration validation failed',
        errors: validation.errors,
        configurationIssue: true
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn("Configuration warnings:", validation.warnings);
      toast({
        title: "Configuration Warnings",
        description: validation.warnings.join(', '),
        variant: "default"
      });
    }

    setIsGenerating(true);
    
    try {
      console.log(`Processing ${chunks.length} chunks with ${mappedConfig.provider}/${mappedConfig.model}`);
      
      // Use the mapped config for the embedding service
      const embeddingService = new EmbeddingService(mappedConfig);
      const batchSize = mappedConfig.batchSize;
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
          if (mappedConfig.embeddingMetadata?.includeChunkIndex && chunk.startPosition !== undefined) {
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
        dimensions: results.length > 0 ? results[0].embedding.length : getDimensionsForModel(mappedConfig.model),
        model: `${mappedConfig.provider}/${mappedConfig.model}`,
        batchSize: mappedConfig.batchSize,
        vectorStorage: mappedConfig.vectorStorage,
        config: {
          provider: mappedConfig.provider,
          model: mappedConfig.model,
          dimensions: results.length > 0 ? results[0].embedding.length : getDimensionsForModel(mappedConfig.model),
          batchSize: mappedConfig.batchSize,
          similarityThreshold: mappedConfig.similarityThreshold,
          vectorStorage: mappedConfig.vectorStorage,
          metadata: mappedConfig.embeddingMetadata
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
        description: `Successfully created ${results.length} embeddings using ${mappedConfig.provider}/${mappedConfig.model}`
      });
      
    } catch (error) {
      console.error("Embedding generation failed:", error);
      
      const result = {
        status: 'error',
        message: 'Embedding generation failed',
        error: error instanceof Error ? error.message : String(error),
        configuration: mappedConfig
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

  // Create display config with validation status
  const displayConfig = configLoaded && loadedConfig 
    ? mapDatabaseConfigToEmbeddingConfig(loadedConfig)
    : null;

  const configValidation = displayConfig 
    ? validateEmbeddingConfig(displayConfig)
    : { isValid: false, errors: ["Configuration not loaded"], warnings: [] };

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
            mappedConfig={displayConfig}
            configValidation={configValidation}
          />

          <Separator />

          <EmbeddingTestControls
            chunks={chunks}
            isGenerating={isGenerating}
            configLoaded={configLoaded}
            configValidation={configValidation}
            mappedConfig={displayConfig}
            onGenerateEmbeddings={handleGenerateEmbeddings}
          />

          {embeddingResults.length > 0 && (
            <>
              <Separator />
              <EmbeddingResults 
                embeddingResults={embeddingResults}
                loadedConfig={displayConfig}
                sourceDocument={sourceDocument}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
