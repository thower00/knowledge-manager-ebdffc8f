
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
import { VerificationStatusAlert, VerificationButton } from "./VerificationStatus";
import { supabase } from "@/integrations/supabase/client";

interface ConfigSettings {
  apiKey: string;
  embeddingModel: string;
  chunkSize: string;
  chunkOverlap: string;
  storagePath: string;
  customConfiguration: string;
}

interface VerificationStatus {
  isVerifying: boolean;
  isValid?: boolean;
  message?: string;
}

export function DocumentProcessingSettings({ activeTab }: { activeTab: string }) {
  const [config, setConfig] = useState<ConfigSettings>({
    apiKey: "",
    embeddingModel: "openai",
    chunkSize: "1000",
    chunkOverlap: "200",
    storagePath: "/data/documents",
    customConfiguration: "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [openAIVerification, setOpenAIVerification] = useState<VerificationStatus>({
    isVerifying: false
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

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Save document processing settings
      toast({
        title: "Document Processing settings saved",
        description: "Your configuration has been saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving configuration:", error);
      toast({
        variant: "destructive",
        title: "Error saving configuration",
        description: `There was a problem saving your configuration: ${error.message || "Unknown error"}`,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const verifyOpenAIKey = async () => {
    setOpenAIVerification({ isVerifying: true });
    
    try {
      console.log("Verifying OpenAI API key:", config.apiKey.substring(0, 5) + "...");
      
      // Call Supabase Edge Function to verify OpenAI API key
      const { data, error } = await supabase.functions.invoke("verify-openai-key", {
        body: { apiKey: config.apiKey },
      });
      
      console.log("Verification response:", data, error);
      
      if (error) {
        throw new Error(error.message || "Verification failed");
      }
      
      if (data?.valid) {
        setOpenAIVerification({ 
          isVerifying: false, 
          isValid: true, 
          message: "OpenAI API key is valid" + (data.models ? ` (Available models: ${data.models.join(', ')})` : '')
        });
      } else {
        setOpenAIVerification({ 
          isVerifying: false, 
          isValid: false, 
          message: data?.error || "Invalid OpenAI API key" 
        });
      }
    } catch (error: any) {
      console.error("Error verifying OpenAI key:", error);
      setOpenAIVerification({ 
        isVerifying: false, 
        isValid: false, 
        message: `Verification failed: ${error.message || "Unknown error"}` 
      });
    }
  };

  return (
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
          <div className="flex space-x-2">
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              value={config.apiKey}
              onChange={handleChange}
              placeholder="Enter your API key"
              className="flex-grow"
            />
            <VerificationButton 
              onClick={verifyOpenAIKey}
              isVerifying={openAIVerification.isVerifying}
              disabled={!config.apiKey}
            />
          </div>
          <VerificationStatusAlert {...openAIVerification} />
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
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </CardFooter>
    </Card>
  );
}
