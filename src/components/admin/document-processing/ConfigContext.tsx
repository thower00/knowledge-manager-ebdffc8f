
import React, { createContext, useContext, useState } from "react";
import { Json } from "@/integrations/supabase/types";

// Define the ConfigSettings interface with an index signature to make it compatible with Json type
export interface ConfigSettings {
  apiKey: string;
  provider: string;
  embeddingModel: string;
  specificModelId: string;
  chunkSize: string;
  chunkOverlap: string;
  chunkStrategy: "fixed_size" | "semantic" | "recursive" | "paragraph" | "sentence";
  storagePath: string;
  customConfiguration: string;
  providerApiKeys: {
    [provider: string]: string;
  };
  [key: string]: string | object; // Add index signature to make it compatible with { [key: string]: Json }
}

interface ConfigContextType {
  config: ConfigSettings;
  setConfig: React.Dispatch<React.SetStateAction<ConfigSettings>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

// Default configuration settings
export const DEFAULT_CONFIG: ConfigSettings = {
  apiKey: "",
  provider: "openai",
  embeddingModel: "openai",
  specificModelId: "text-embedding-ada-002",
  chunkSize: "1000",
  chunkOverlap: "200",
  chunkStrategy: "fixed_size",
  storagePath: "/data/documents",
  customConfiguration: "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
  providerApiKeys: {}
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [config, setConfig] = useState<ConfigSettings>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <ConfigContext.Provider
      value={{ config, setConfig, isLoading, setIsLoading, isSaving, setIsSaving }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};
