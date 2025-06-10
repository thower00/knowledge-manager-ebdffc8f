
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CHAT_PROVIDERS } from "../document-processing/utils/chatProviders";
import { useConfig } from "../document-processing/ConfigContext";
import { useToast } from "@/components/ui/use-toast";
import { Check, AlertCircle } from "lucide-react";

interface ChatAPIKeyFieldProps {
  isLoading: boolean;
}

export function ChatAPIKeyField({ isLoading }: ChatAPIKeyFieldProps) {
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
      if (!provider || !provider.verificationEndpoint) {
        throw new Error("Invalid provider configuration");
      }

      const { data, error } = await fetch(provider.verificationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey })
      }).then(res => res.json());

      if (error) {
        throw new Error(error);
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
