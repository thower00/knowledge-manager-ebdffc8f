
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerificationStatusAlert, VerificationButton } from "../VerificationStatus";
import { supabase } from "@/integrations/supabase/client";

interface OpenAIKeyFieldProps {
  apiKey: string;
  onChange: (name: string, value: string) => void;
  isLoading: boolean;
}

interface VerificationStatus {
  isVerifying: boolean;
  isValid?: boolean;
  message?: string;
}

export function OpenAIKeyField({ apiKey, onChange, isLoading }: OpenAIKeyFieldProps) {
  const [openAIVerification, setOpenAIVerification] = useState<VerificationStatus>({
    isVerifying: false
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.name, e.target.value);
  };
  
  const verifyOpenAIKey = async () => {
    setOpenAIVerification({ isVerifying: true });
    
    try {
      console.log("Verifying OpenAI API key:", apiKey.substring(0, 5) + "...");
      
      // Call Supabase Edge Function to verify OpenAI API key
      const { data, error } = await supabase.functions.invoke("verify-openai-key", {
        body: { apiKey },
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
    <div className="grid gap-2">
      <Label htmlFor="apiKey">API Key</Label>
      <div className="flex space-x-2">
        <Input
          id="apiKey"
          name="apiKey"
          type="password"
          value={apiKey}
          onChange={handleChange}
          placeholder="Enter your API key"
          className="flex-grow"
          disabled={isLoading}
        />
        <VerificationButton 
          onClick={verifyOpenAIKey}
          isVerifying={openAIVerification.isVerifying}
          disabled={!apiKey || isLoading}
        />
      </div>
      <VerificationStatusAlert {...openAIVerification} />
      <p className="text-sm text-muted-foreground">
        API key for external services like OpenAI or Cohere.
      </p>
    </div>
  );
}
