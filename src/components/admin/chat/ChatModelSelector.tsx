
import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHAT_PROVIDERS } from "../document-processing/utils/chatProviders";
import { useChatConfig } from "./ChatConfigContext";
import { Badge } from "@/components/ui/badge";

interface ChatModelSelectorProps {
  isLoading: boolean;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
}

export function ChatModelSelector({ isLoading, onProviderChange, onModelChange }: ChatModelSelectorProps) {
  const { config } = useChatConfig();
  const { chatProvider, chatModel } = config;
  
  // Force re-render on mount to ensure UI shows correct values
  useEffect(() => {
    console.log("ChatModelSelector mounted with provider:", chatProvider, "model:", chatModel);
    
    // Check if we have valid provider and model
    if (!chatProvider || !CHAT_PROVIDERS[chatProvider]) {
      console.log("Invalid chat provider, setting to default: openai");
      onProviderChange("openai");
    } else if (!chatModel) {
      console.log("No chat model selected, selecting default for provider:", chatProvider);
      const defaultModel = CHAT_PROVIDERS[chatProvider]?.defaultModel;
      if (defaultModel) {
        onModelChange(defaultModel);
      }
    }
  }, []);
  
  const handleProviderChange = (newProvider: string) => {
    onProviderChange(newProvider);
  };
  
  const handleModelChange = (newModel: string) => {
    onModelChange(newModel);
  };
  
  // Find the currently selected model
  const selectedModel = CHAT_PROVIDERS[chatProvider]?.models.find(m => m.id === chatModel);
  
  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="chatProvider">Chat Provider</Label>
        <Select
          value={chatProvider || "openai"}
          onValueChange={handleProviderChange}
          disabled={isLoading}
        >
          <SelectTrigger id="chatProvider" className="bg-background">
            <SelectValue placeholder="Select chat provider" />
          </SelectTrigger>
          <SelectContent className="bg-background max-h-[300px]">
            {Object.entries(CHAT_PROVIDERS).map(([id, providerConfig]) => (
              <SelectItem key={id} value={id}>{providerConfig.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Provider for chat models
        </p>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="chatModel">Chat Model</Label>
        <Select
          value={chatModel || (CHAT_PROVIDERS[chatProvider]?.defaultModel || "")}
          onValueChange={handleModelChange}
          disabled={isLoading}
        >
          <SelectTrigger id="chatModel" className="bg-background">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-background overflow-y-auto">
            {CHAT_PROVIDERS[chatProvider]?.models.map(model => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedModel?.description && (
          <p className="text-sm text-muted-foreground">
            {selectedModel.description}
          </p>
        )}
        
        {selectedModel && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedModel.contextWindow && (
              <Badge variant="outline">
                Context: {selectedModel.contextWindow}
              </Badge>
            )}
            {selectedModel.capabilities?.map((capability, idx) => (
              <Badge key={idx} variant="secondary">
                {capability}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
