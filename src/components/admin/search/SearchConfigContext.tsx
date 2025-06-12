
import React, { createContext, useContext, useState } from "react";

// Search configuration interface
export interface SearchConfigSettings {
  // Similarity Thresholds
  factualQuestionThresholds: number[];
  summaryRequestThresholds: number[];
  standardThresholds: number[];
  
  // Match Count (Number of chunks)
  factualQuestionMatchCount: number;
  summaryMatchCount: number;
  extensiveSummaryMatchCount: number;
  standardMatchCount: number;
  
  // Content Length (Character limits)
  factualQuestionContentLength: number;
  summaryContentLength: number;
  extensiveSummaryContentLength: number;
  standardContentLength: number;
  
  // Processing Limits
  factualQuestionChunksPerDocument: number;
  summaryChunksPerDocument: number;
  extensiveSummaryChunksPerDocument: number;
  standardChunksPerDocument: number;
  
  factualQuestionTotalChunksLimit: number;
  summaryTotalChunksLimit: number;
  extensiveSummaryTotalChunksLimit: number;
  standardTotalChunksLimit: number;
  
  // Additional search parameters
  enhancedContentSearchLimit: number;
  titleSearchMinWordLength: number;
  contentSearchBatchSize: number;
}

interface SearchConfigContextType {
  config: SearchConfigSettings;
  setConfig: React.Dispatch<React.SetStateAction<SearchConfigSettings>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

// Default search configuration values (optimized based on testing)
export const DEFAULT_SEARCH_CONFIG: SearchConfigSettings = {
  // Similarity Thresholds - Lower values for better recall
  factualQuestionThresholds: [0.1, 0.2, 0.3, 0.4, 0.5],
  summaryRequestThresholds: [0.1, 0.2, 0.3, 0.4, 0.5],
  standardThresholds: [0.15, 0.25, 0.35, 0.45],
  
  // Match Count - More chunks for comprehensive answers
  factualQuestionMatchCount: 25,
  summaryMatchCount: 25,
  extensiveSummaryMatchCount: 30,
  standardMatchCount: 15,
  
  // Content Length - Longer content for detailed responses
  factualQuestionContentLength: 3000,
  summaryContentLength: 1800,
  extensiveSummaryContentLength: 2500,
  standardContentLength: 1500,
  
  // Processing Limits - Chunks per document
  factualQuestionChunksPerDocument: 8,
  summaryChunksPerDocument: 5,
  extensiveSummaryChunksPerDocument: 8,
  standardChunksPerDocument: 4,
  
  // Total chunks limit
  factualQuestionTotalChunksLimit: 20,
  summaryTotalChunksLimit: 15,
  extensiveSummaryTotalChunksLimit: 20,
  standardTotalChunksLimit: 12,
  
  // Additional parameters
  enhancedContentSearchLimit: 5,
  titleSearchMinWordLength: 2,
  contentSearchBatchSize: 2
};

const SearchConfigContext = createContext<SearchConfigContextType | undefined>(undefined);

export const SearchConfigProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [config, setConfig] = useState<SearchConfigSettings>(DEFAULT_SEARCH_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <SearchConfigContext.Provider
      value={{ config, setConfig, isLoading, setIsLoading, isSaving, setIsSaving }}
    >
      {children}
    </SearchConfigContext.Provider>
  );
};

export const useSearchConfig = () => {
  const context = useContext(SearchConfigContext);
  if (context === undefined) {
    throw new Error("useSearchConfig must be used within a SearchConfigProvider");
  }
  return context;
};
