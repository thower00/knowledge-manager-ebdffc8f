
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ExternalLink, Check, X } from "lucide-react";
import { useProcessingConfiguration } from "./hooks/useProcessingConfiguration";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ProcessingConfiguration() {
  const { config, isLoading } = useProcessingConfiguration();

  const handleConfigurationManagement = () => {
    window.open('/configuration-management', '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Processing Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-sm text-muted-foreground">Loading configuration...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Processing Configuration</CardTitle>
          </div>
        </div>
        <CardDescription>
          Current processing settings loaded from Configuration Management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <ExternalLink className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              These settings are read-only and synchronized with Configuration Management. To modify these settings, please use the Configuration Management section.
            </span>
            <Button variant="outline" size="sm" onClick={handleConfigurationManagement}>
              Open Configuration Management
            </Button>
          </AlertDescription>
        </Alert>

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
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Characters per chunk</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                  <Input
                    id="chunkOverlap"
                    type="number"
                    value={config.chunking.chunkOverlap}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Overlapping characters</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="chunkStrategy">Chunking Strategy</Label>
                <Select value={config.chunking.chunkStrategy} disabled>
                  <SelectTrigger className="bg-muted">
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
                  <Select value={config.embedding.provider} disabled>
                    <SelectTrigger className="bg-muted">
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
                  <Select value={config.embedding.model} disabled>
                    <SelectTrigger className="bg-muted">
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKeyStatus">API Key Status</Label>
                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted">
                    {config.embedding.apiKey ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Configured</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">Not configured</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API key status for {config.embedding.provider} embedding generation
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    value={config.embedding.batchSize}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of chunks to process in each batch
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
