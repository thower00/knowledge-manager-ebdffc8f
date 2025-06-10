
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from "./ConfigContext";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Target } from "lucide-react";

interface EmbeddingSettingsProps {
  isLoading: boolean;
}

export function EmbeddingSettings({ isLoading }: EmbeddingSettingsProps) {
  const { config, setConfig } = useConfig();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleMetadataChange = (field: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      embeddingMetadata: {
        ...prev.embeddingMetadata,
        [field]: checked
      }
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Processing Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="embeddingBatchSize">Batch Size</Label>
              <Input
                id="embeddingBatchSize"
                name="embeddingBatchSize"
                type="number"
                value={config.embeddingBatchSize}
                onChange={handleChange}
                disabled={isLoading}
                min="1"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Number of chunks to process at once
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="similarityThreshold">Similarity Threshold</Label>
              <Input
                id="similarityThreshold"
                name="similarityThreshold"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.similarityThreshold}
                onChange={handleChange}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Minimum similarity score for search results (0.0 - 1.0)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Vector Storage</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Storage Provider</Label>
            <Select
              value={config.vectorStorage}
              onValueChange={(value) => handleSelectChange("vectorStorage", value)}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select vector storage provider" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="supabase">
                  <div className="flex items-center space-x-2">
                    <span>Supabase (pgvector)</span>
                    <Badge variant="secondary">Recommended</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="pinecone">Pinecone</SelectItem>
                <SelectItem value="weaviate">Weaviate</SelectItem>
                <SelectItem value="local">Local Storage</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose where to store vector embeddings
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Embedding Metadata</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSource"
                checked={config.embeddingMetadata.includeSource}
                onCheckedChange={(checked) => handleMetadataChange("includeSource", checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="includeSource" className="text-sm font-normal">
                Include source document reference
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeTimestamp"
                checked={config.embeddingMetadata.includeTimestamp}
                onCheckedChange={(checked) => handleMetadataChange("includeTimestamp", checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="includeTimestamp" className="text-sm font-normal">
                Include creation timestamp
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeModelInfo"
                checked={config.embeddingMetadata.includeModelInfo}
                onCheckedChange={(checked) => handleMetadataChange("includeModelInfo", checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="includeModelInfo" className="text-sm font-normal">
                Include embedding model information
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeChunkIndex"
                checked={config.embeddingMetadata.includeChunkIndex}
                onCheckedChange={(checked) => handleMetadataChange("includeChunkIndex", checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="includeChunkIndex" className="text-sm font-normal">
                Include chunk index and position
              </Label>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Select what metadata to store with each embedding vector
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
