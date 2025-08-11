
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useConfig } from "./ConfigContext";
import { MODEL_PROVIDERS } from "./utils/modelProviders";
import { useToast } from "@/hooks/use-toast";
import { Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toastWarning } from "@/lib/toast";

export function OpenAIKeyField({ isLoading }: { isLoading: boolean }) {
  const { config, setConfig } = useConfig();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({
      ...prev,
      apiKey: e.target.value
    }));
    setIsValid(null);
  };

  const verifyApiKey = async () => {
    if (!config.apiKey.trim()) {
      toastWarning({
        title: "API key required",
        description: "Please enter your API key",
      });
      return;
    }

    setIsVerifying(true);
    setIsValid(null);

    try {
      console.log(`Verifying ${config.provider} API key...`);
      
      // Map provider to the correct edge function
      const functionName = config.provider === 'openai' ? 'verify-openai-key' : 
                          config.provider === 'anthropic' ? 'verify-anthropic-key' :
                          config.provider === 'cohere' ? 'verify-cohere-key' :
                          config.provider === 'huggingface' ? 'verify-huggingface-key' :
                          'verify-openai-key'; // default fallback

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { apiKey: config.apiKey }
      });

      console.log(`Verification response:`, { data, error });

      if (error) {
        throw new Error(error.message || 'Verification failed');
      }

      if (data?.valid) {
        setIsValid(true);
        toast({
          title: "API key verified",
          description: `Your ${config.provider} API key is valid`,
        });

        // If we received models from the API, update the available models
        if (data.models && data.models.length > 0) {
          console.log(`Received ${config.provider} models:`, data.models);
        }
        
        // Save the verified API key to the provider-specific keys
        setConfig(prev => ({
          ...prev,
          providerApiKeys: {
            ...prev.providerApiKeys,
            [config.provider]: config.apiKey
          }
        }));
      } else {
        setIsValid(false);
        toast({
          variant: "destructive",
          title: "Invalid API key",
          description: data?.error || `Unable to verify your ${config.provider} API key`,
        });
      }
    } catch (err: any) {
      console.error("Error verifying API key:", err);
      setIsValid(false);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: err.message || "An error occurred during verification",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const providerConfig = MODEL_PROVIDERS[config.provider];
  const placeholder = providerConfig?.apiKeyPlaceholder || "Enter API key";
  const description = providerConfig?.apiKeyDescription || "API key for embedding models";
  const apiKeyName = providerConfig?.apiKeyName || "API_KEY";

  // When the provider changes, try to load a saved API key
  useEffect(() => {
    const savedKey = config.providerApiKeys[config.provider] || "";
    if (savedKey && savedKey !== config.apiKey) {
      setConfig(prev => ({
        ...prev,
        apiKey: savedKey
      }));
      
      // Clear previous verification
      setIsValid(null);
    }
  }, [config.provider]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="apiKey">{apiKeyName}</Label>
        <div className="flex items-center gap-2">
          {isValid === true && !isVerifying && (
            <div className="flex items-center text-sm text-green-500 gap-1">
              <Check size={16} />
              <span>Verified</span>
            </div>
          )}
          {isValid === false && !isVerifying && (
            <div className="flex items-center text-sm text-destructive gap-1">
              <AlertCircle size={16} />
              <span>Invalid</span>
            </div>
          )}
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={verifyApiKey}
            disabled={isVerifying || isLoading || !config.apiKey.trim()}
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>
      <Input
        id="apiKey"
        name="apiKey"
        type="password"
        placeholder={placeholder}
        value={config.apiKey}
        onChange={handleApiKeyChange}
        disabled={isLoading}
        className="font-mono"
      />
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
