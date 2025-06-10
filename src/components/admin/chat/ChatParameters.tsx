
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useConfig } from "../document-processing/ConfigContext";

interface ChatParametersProps {
  isLoading: boolean;
}

export function ChatParameters({ isLoading }: ChatParametersProps) {
  const { config, setConfig } = useConfig();
  const { chatTemperature, chatMaxTokens, chatSystemPrompt } = config;
  
  const handleTemperatureChange = (value: number[]) => {
    setConfig(prev => ({ ...prev, chatTemperature: value[0].toString() }));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="chatTemperature">Temperature: {parseFloat(chatTemperature || "0.7").toFixed(1)}</Label>
          <span className="text-xs text-muted-foreground">
            {parseFloat(chatTemperature || "0.7") < 0.4 ? "More deterministic" : 
             parseFloat(chatTemperature || "0.7") > 1.0 ? "More creative" : "Balanced"}
          </span>
        </div>
        <Slider
          id="chatTemperature"
          min={0}
          max={2}
          step={0.1}
          defaultValue={[parseFloat(chatTemperature || "0.7")]}
          value={[parseFloat(chatTemperature || "0.7")]} 
          onValueChange={handleTemperatureChange}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Controls randomness: lower values are more deterministic, higher values are more creative
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="chatMaxTokens">Max Tokens</Label>
        <Input
          id="chatMaxTokens"
          name="chatMaxTokens"
          type="number"
          min={100}
          max={8000}
          value={chatMaxTokens || "2000"}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Maximum number of tokens to generate in the response
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="chatSystemPrompt">System Prompt</Label>
        <Textarea
          id="chatSystemPrompt"
          name="chatSystemPrompt"
          value={chatSystemPrompt || "You are a helpful assistant answering questions based on the provided context."}
          onChange={handleInputChange}
          rows={4}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Instructions that define how the AI assistant behaves
        </p>
      </div>
    </div>
  );
}
