
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfig } from "../../document-processing/ConfigContext";
import { EmbeddingService, EmbeddingConfig } from "@/services/embedding/embeddingService";
import { Loader2, Zap, Search, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toastWarning } from "@/lib/toast";

export function EmbeddingsTestTab() {
  const { config } = useConfig();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [testText, setTestText] = useState("This is a sample document about machine learning and artificial intelligence.");
  const [queryText, setQueryText] = useState("artificial intelligence");
  const [embeddingResult, setEmbeddingResult] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Map ConfigSettings to EmbeddingConfig
  const createEmbeddingConfig = (): EmbeddingConfig => ({
    provider: config.provider as "openai" | "cohere" | "huggingface",
    model: config.specificModelId,
    apiKey: config.providerApiKeys[config.provider] || config.apiKey || "",
    batchSize: parseInt(config.embeddingBatchSize) || 10,
    similarityThreshold: config.similarityThreshold,
    embeddingMetadata: config.embeddingMetadata,
    vectorStorage: config.vectorStorage
  });

  const handleGenerateEmbedding = async () => {
    if (!testText.trim()) {
      toastWarning({
        title: "Missing text",
        description: "Please enter text to generate embeddings.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log("Generating embedding for text:", testText);
      const embeddingService = new EmbeddingService(createEmbeddingConfig());
      const result = await embeddingService.generateEmbedding(testText);
      setEmbeddingResult(result);
      
      toast({
        title: "Embedding Generated",
        description: `Successfully generated ${result.embedding.length}-dimensional embedding using ${result.provider}/${result.model}`,
      });
    } catch (error: any) {
      console.error("Error generating embedding:", error);
      toast({
        variant: "destructive",
        title: "Error generating embedding",
        description: error.message || "Failed to generate embedding",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchSimilar = async () => {
    if (!queryText.trim()) {
      toastWarning({
        title: "Missing query",
        description: "Please enter search text.",
      });
      return;
    }

    setIsSearching(true);
    try {
      console.log("Searching for similar embeddings:", queryText);
      const embeddingService = new EmbeddingService(createEmbeddingConfig());
      const results = await embeddingService.searchSimilarEmbeddings(queryText, 10);
      setSearchResults(results);
      
      toast({
        title: "Search Completed",
        description: `Found ${results.length} similar documents`,
      });
    } catch (error: any) {
      console.error("Error searching embeddings:", error);
      toast({
        variant: "destructive",
        title: "Error searching embeddings",
        description: error.message || "Failed to search embeddings",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Embedding Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Generate Embedding</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testText">Test Text</Label>
              <Textarea
                id="testText"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to generate embeddings..."
                rows={4}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{config.provider}</Badge>
              <Badge variant="outline">{config.specificModelId}</Badge>
            </div>
            
            <Button 
              onClick={handleGenerateEmbedding} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Embedding
                </>
              )}
            </Button>
            
            {embeddingResult && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Result:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Model:</strong> {embeddingResult.model}</p>
                  <p><strong>Provider:</strong> {embeddingResult.provider}</p>
                  <p><strong>Dimensions:</strong> {embeddingResult.embedding.length}</p>
                  <p><strong>Sample values:</strong> [{embeddingResult.embedding.slice(0, 3).map((v: number) => v.toFixed(4)).join(', ')}...]</p>
                  {embeddingResult.usage && (
                    <p><strong>Tokens used:</strong> {embeddingResult.usage.total_tokens}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Similar Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Search Similar</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="queryText">Query Text</Label>
              <Input
                id="queryText"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Enter search query..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Similarity: {config.similarityThreshold}</Badge>
              <Badge variant="outline">Storage: {config.vectorStorage}</Badge>
            </div>
            
            <Button 
              onClick={handleSearchSimilar} 
              disabled={isSearching}
              className="w-full"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Similar
                </>
              )}
            </Button>
            
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Search Results ({searchResults.length}):</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.map((result, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      <div className="font-medium truncate">{result.document_title}</div>
                      <div className="text-muted-foreground text-xs">
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs mt-1 truncate">
                        {result.chunk_content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuration Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Current Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Provider:</strong> {config.provider}
            </div>
            <div>
              <strong>Model:</strong> {config.specificModelId}
            </div>
            <div>
              <strong>Batch Size:</strong> {config.embeddingBatchSize}
            </div>
            <div>
              <strong>Similarity Threshold:</strong> {config.similarityThreshold}
            </div>
            <div>
              <strong>Vector Storage:</strong> {config.vectorStorage}
            </div>
            <div>
              <strong>API Key:</strong> {config.apiKey ? '***' + config.apiKey.slice(-4) : 'Not set'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
