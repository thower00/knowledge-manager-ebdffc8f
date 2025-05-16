
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConfigSettings {
  apiKey: string;
  embeddingModel: string;
  chunkSize: string;
  chunkOverlap: string;
  storagePath: string;
  customConfiguration: string;
}

export function ConfigurationManagement() {
  const [config, setConfig] = useState<ConfigSettings>({
    apiKey: "",
    embeddingModel: "openai",
    chunkSize: "1000",
    chunkOverlap: "200",
    storagePath: "/data/documents",
    customConfiguration: "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
  });
  
  const { toast } = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setConfig({ ...config, [name]: value });
  };

  const handleSave = () => {
    // In a real app, this would make an API call to save the configuration
    toast({
      title: "Configuration saved",
      description: "Your configuration has been saved successfully",
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Processing Settings</CardTitle>
          <CardDescription>
            Configure how documents are processed and stored in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              value={config.apiKey}
              onChange={handleChange}
              placeholder="Enter your API key"
            />
            <p className="text-sm text-muted-foreground">
              API key for external services like OpenAI or Cohere.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="embeddingModel">Embedding Model</Label>
            <Select
              value={config.embeddingModel}
              onValueChange={(value) => 
                handleSelectChange("embeddingModel", value)
              }
            >
              <SelectTrigger id="embeddingModel">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="cohere">Cohere</SelectItem>
                <SelectItem value="huggingface">HuggingFace</SelectItem>
                <SelectItem value="local">Local Model</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Model used for creating text embeddings.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="chunkSize">Chunk Size</Label>
              <Input
                id="chunkSize"
                name="chunkSize"
                value={config.chunkSize}
                onChange={handleChange}
                placeholder="1000"
              />
              <p className="text-sm text-muted-foreground">
                Size of text chunks for processing.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
              <Input
                id="chunkOverlap"
                name="chunkOverlap"
                value={config.chunkOverlap}
                onChange={handleChange}
                placeholder="200"
              />
              <p className="text-sm text-muted-foreground">
                Overlap between consecutive chunks.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="storagePath">Storage Path</Label>
            <Input
              id="storagePath"
              name="storagePath"
              value={config.storagePath}
              onChange={handleChange}
              placeholder="/data/documents"
            />
            <p className="text-sm text-muted-foreground">
              Path where processed documents are stored.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customConfiguration">Custom Configuration (JSON)</Label>
            <Textarea
              id="customConfiguration"
              name="customConfiguration"
              value={config.customConfiguration}
              onChange={handleChange}
              placeholder="Enter custom JSON configuration"
              rows={5}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              Additional configuration in JSON format.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Reset</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
