
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, RotateCcw } from "lucide-react";
import { useProcessingConfiguration } from "./hooks/useProcessingConfiguration";

export function ProcessingConfiguration() {
  const {
    config,
    updateChunkingConfig,
    updateEmbeddingConfig,
    resetToDefaults
  } = useProcessingConfiguration();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Processing Configuration</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
        <CardDescription>
          Configure chunking and embedding settings for document processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chunking" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chunking">Chunking</TabsTrigger>
            <TabsTrigger value="embedding">Embeddings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chunking" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Chunk Size</Label>
                  <Input
                    id="chunkSize"
                    type="number"
                    value={config.chunking.chunkSize}
                    onChange={(e) => updateChunkingConfig({ chunkSize: parseInt(e.target.value) || 1000 })}
                    min={100}
                    max={8000}
                  />
                  <p className="text-xs text-muted-foreground">Characters per chunk (100-8000)</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                  <Input
                    id="chunkOverlap"
                    type="number"
                    value={config.chunking.chunkOverlap}
                    onChange={(e) => updateChunkingConfig({ chunkOverlap: parseInt(e.target.value) || 200 })}
                    min={0}
                    max={1000}
                  />
                  <p className="text-xs text-muted-foreground">Overlapping characters (0-1000)</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="chunkStrategy">Chunking Strategy</Label>
                <Select 
                  value={config.chunking.chunkStrategy} 
                  onValueChange={(value: any) => updateChunkingConfig({ chunkStrategy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_size">Fixed Size</SelectItem>
                    <SelectItem value="paragraph">Paragraph-based</SelectItem>
                    <SelectItem value="sentence">Sentence-based</SelectItem>
                    <SelectItem value="recursive">Recursive (Recommended)</SelectItem>
                    <SelectItem value="semantic">Semantic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How to split documents into chunks
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="embedding" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select 
                    value={config.embedding.provider} 
                    onValueChange={(value: any) => updateEmbeddingConfig({ provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="cohere">Cohere</SelectItem>
                      <SelectItem value="huggingface">Hugging Face</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select 
                    value={config.embedding.model} 
                    onValueChange={(value) => updateEmbeddingConfig({ model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {config.embedding.provider === "openai" && (
                        <>
                          <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                          <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                          <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                        </>
                      )}
                      {config.embedding.provider === "cohere" && (
                        <>
                          <SelectItem value="embed-english-v3.0">embed-english-v3.0</SelectItem>
                          <SelectItem value="embed-multilingual-v3.0">embed-multilingual-v3.0</SelectItem>
                        </>
                      )}
                      {config.embedding.provider === "huggingface" && (
                        <>
                          <SelectItem value="sentence-transformers/all-MiniLM-L6-v2">all-MiniLM-L6-v2</SelectItem>
                          <SelectItem value="sentence-transformers/all-mpnet-base-v2">all-mpnet-base-v2</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={config.embedding.apiKey}
                  onChange={(e) => updateEmbeddingConfig({ apiKey: e.target.value })}
                  placeholder="Enter your API key"
                />
                <p className="text-xs text-muted-foreground">
                  Required for {config.embedding.provider} embedding generation
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  value={config.embedding.batchSize}
                  onChange={(e) => updateEmbeddingConfig({ batchSize: parseInt(e.target.value) || 100 })}
                  min={1}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground">
                  Number of chunks to process in each batch (1-1000)
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
