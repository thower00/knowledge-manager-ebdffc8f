
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerificationStatusAlert, VerificationButton } from "../VerificationStatus";
import { supabase } from "@/integrations/supabase/client";
import { useConfig } from "./ConfigContext";
import { MODEL_PROVIDERS } from "./utils/modelProviders";

interface OpenAIKeyFieldProps {
  isLoading: boolean;
}

interface VerificationStatus {
  isVerifying: boolean;
  isValid?: boolean;
  message?: string;
}

export function OpenAIKeyField({ isLoading }: OpenAIKeyFieldProps) {
  const { config, setConfig } = useConfig();
  const { apiKey, provider } = config;
  
  const [keyVerification, setKeyVerification] = useState<VerificationStatus>({
    isVerifying: false
  });
  
  // Update the field label and placeholder based on the selected provider
  const providerConfig = MODEL_PROVIDERS[provider] || MODEL_PROVIDERS.openai;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({
      ...prev,
      apiKey: e.target.value,
    }));
  };
  
  const verifyApiKey = async () => {
    setKeyVerification({ isVerifying: true });
    
    try {
      console.log(`Verifying ${providerConfig.name} API key:`, apiKey.substring(0, 5) + "...");
      
      // Determine which edge function to call based on the provider
      let functionName = "verify-openai-key"; // Default
      
      if (provider === "cohere") {
        functionName = "verify-cohere-key";
      } else if (provider === "huggingface") {
        functionName = "verify-huggingface-key";
      }
      
      // For local models, no verification is needed
      if (provider === "local") {
        setKeyVerification({
          isVerifying: false,
          isValid: true,
          message: "No verification needed for local models"
        });
        return;
      }
      
      // Call Supabase Edge Function to verify API key
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { apiKey },
      });
      
      console.log("Verification response:", data, error);
      
      if (error) {
        throw new Error(error.message || "Verification failed");
      }
      
      if (data?.valid) {
        setKeyVerification({ 
          isVerifying: false, 
          isValid: true, 
          message: `${providerConfig.name} API key is valid` + (data.models ? ` (Available models: ${data.models.slice(0, 3).join(', ')}${data.models.length > 3 ? '...' : ''})` : '')
        });
        
        // Save the verified API key to the provider-specific keys
        setConfig(prev => ({
          ...prev,
          providerApiKeys: {
            ...prev.providerApiKeys,
            [provider]: apiKey
          }
        }));
      } else {
        setKeyVerification({ 
          isVerifying: false, 
          isValid: false, 
          message: data?.error || `Invalid ${providerConfig.name} API key`
        });
      }
    } catch (error: any) {
      console.error(`Error verifying ${providerConfig.name} key:`, error);
      setKeyVerification({ 
        isVerifying: false, 
        isValid: false, 
        message: `Verification failed: ${error.message || "Unknown error"}` 
      });
    }
  };
  
  // When the provider changes, try to load a saved API key
  useEffect(() => {
    const savedKey = config.providerApiKeys[provider] || "";
    if (savedKey && savedKey !== apiKey) {
      setConfig(prev => ({
        ...prev,
        apiKey: savedKey
      }));
      
      // Clear previous verification
      setKeyVerification({
        isVerifying: false
      });
    }
  }, [provider]);
  
  return (
    <div className="grid gap-2">
      <Label htmlFor="apiKey">{providerConfig.name} API Key</Label>
      <div className="flex space-x-2">
        <Input
          id="apiKey"
          name="apiKey"
          type="password"
          value={apiKey}
          onChange={handleChange}
          placeholder={providerConfig.apiKeyPlaceholder}
          className="flex-grow"
          disabled={isLoading || provider === "local"}
        />
        <VerificationButton 
          onClick={verifyApiKey}
          isVerifying={keyVerification.isVerifying}
          disabled={!apiKey || isLoading || provider === "local"}
        />
      </div>
      <VerificationStatusAlert {...keyVerification} />
      <p className="text-sm text-muted-foreground">
        {providerConfig.apiKeyDescription}
      </p>
    </div>
  );
}
