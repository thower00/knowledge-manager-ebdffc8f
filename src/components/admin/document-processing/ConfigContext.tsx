
import React, { createContext, useContext, useState } from "react";
import { Json } from "@/integrations/supabase/types";

// Define the ConfigSettings interface with an index signature to make it compatible with Json type
export interface ConfigSettings {
  apiKey: string;
  embeddingModel: string;
  chunkSize: string;
  chunkOverlap: string;
  storagePath: string;
  customConfiguration: string;
  [key: string]: string; // Add index signature to make it compatible with { [key: string]: Json }
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
  embeddingModel: "openai",
  chunkSize: "1000",
  chunkOverlap: "200",
  storagePath: "/data/documents",
  customConfiguration: "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
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
