
import React, { createContext, useContext, useState } from "react";

// Chat-specific configuration interface
export interface ChatConfigSettings {
  chatProvider: string;
  chatModel: string;
  chatTemperature: string;
  chatMaxTokens: string;
  chatSystemPrompt: string;
  apiKey: string;
  chatProviderApiKeys: {
    [provider: string]: string;
  };
}

interface ChatConfigContextType {
  config: ChatConfigSettings;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfigSettings>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

// Default chat configuration settings
export const DEFAULT_CHAT_CONFIG: ChatConfigSettings = {
  chatProvider: "openai",
  chatModel: "gpt-4o-mini",
  chatTemperature: "0.7",
  chatMaxTokens: "2000",
  chatSystemPrompt: "You are a helpful assistant answering questions based on the provided context. Always use the document content when available and provide comprehensive, detailed responses.",
  apiKey: "",
  chatProviderApiKeys: {}
};

const ChatConfigContext = createContext<ChatConfigContextType | undefined>(undefined);

export const ChatConfigProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [config, setConfig] = useState<ChatConfigSettings>(DEFAULT_CHAT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <ChatConfigContext.Provider
      value={{ config, setConfig, isLoading, setIsLoading, isSaving, setIsSaving }}
    >
      {children}
    </ChatConfigContext.Provider>
  );
};

export const useChatConfig = () => {
  const context = useContext(ChatConfigContext);
  if (context === undefined) {
    throw new Error("useChatConfig must be used within a ChatConfigProvider");
  }
  return context;
};
