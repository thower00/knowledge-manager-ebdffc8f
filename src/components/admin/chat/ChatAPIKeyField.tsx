
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CHAT_PROVIDERS } from "../document-processing/utils/chatProviders";
import { useChatConfig } from "./ChatConfigContext";
import { useToast } from "@/hooks/use-toast";
import { Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatAPIKeyFieldProps {
  isLoading: boolean;
}

export function ChatAPIKeyField({ isLoading }: ChatAPIKeyFieldProps) {
  const { config, setConfig } = useChatConfig();
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
      toast({
        variant: "destructive",
        title: "API key required",
        description: `Please enter your ${CHAT_PROVIDERS[config.chatProvider]?.name || "provider"} API key`,
      });
      return;
    }

    setIsVerifying(true);
    setIsValid(null);

    try {
      const provider = CHAT_PROVIDERS[config.chatProvider];
      if (!provider) {
        throw new Error("Invalid provider configuration");
      }

      console.log(`Verifying ${provider.name} API key...`);
      
      // Use Supabase function invocation instead of direct fetch
      const functionName = config.chatProvider === 'openai' ? 'verify-openai-key' : 
                          config.chatProvider === 'anthropic' ? 'verify-anthropic-key' :
                          config.chatProvider === 'cohere' ? 'verify-cohere-key' :
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
          description: `Your ${provider.name} API key is valid`,
        });

        // Save the verified API key to the provider-specific keys
        setConfig(prev => ({
          ...prev,
          chatProviderApiKeys: {
            ...prev.chatProviderApiKeys,
            [config.chatProvider]: config.apiKey
          }
        }));
      } else {
        setIsValid(false);
        toast({
          variant: "destructive",
          title: "Invalid API key",
          description: data?.error || `Unable to verify your ${provider.name} API key`,
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

  const providerConfig = CHAT_PROVIDERS[config.chatProvider];
  const placeholder = providerConfig?.apiKeyPlaceholder || "Enter API key";
  const description = providerConfig?.apiKeyDescription || "API key for chat models";
  const apiKeyName = providerConfig?.apiKeyName || "API_KEY";

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
