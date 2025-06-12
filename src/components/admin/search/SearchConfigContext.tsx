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

// Enhanced default search configuration values for comprehensive factual question coverage
export const DEFAULT_SEARCH_CONFIG: SearchConfigSettings = {
  // Similarity Thresholds - Lower values for better recall, especially for factual questions
  factualQuestionThresholds: [0.03, 0.1, 0.2, 0.3, 0.4], // Even lower thresholds for comprehensive coverage
  summaryRequestThresholds: [0.1, 0.2, 0.3, 0.4, 0.5],
  standardThresholds: [0.15, 0.25, 0.35, 0.45],
  
  // Match Count - Significantly increased for factual questions to capture complete information
  factualQuestionMatchCount: 50, // Increased from 40 to 50 for comprehensive coverage
  summaryMatchCount: 25,
  extensiveSummaryMatchCount: 30,
  standardMatchCount: 15,
  
  // Content Length - Increased for factual questions to capture more context
  factualQuestionContentLength: 6000, // Increased from 5000 to 6000
  summaryContentLength: 1800,
  extensiveSummaryContentLength: 2500,
  standardContentLength: 1500,
  
  // Processing Limits - Enhanced for factual questions to ensure comprehensive document coverage
  factualQuestionChunksPerDocument: 18, // Increased from 15 to 18 for better document coverage
  summaryChunksPerDocument: 5,
  extensiveSummaryChunksPerDocument: 8,
  standardChunksPerDocument: 4,
  
  // Total chunks limit - Increased for factual questions
  factualQuestionTotalChunksLimit: 45, // Increased from 35 to 45 for comprehensive coverage
  summaryTotalChunksLimit: 15,
  extensiveSummaryTotalChunksLimit: 20,
  standardTotalChunksLimit: 12,
  
  // Additional parameters
  enhancedContentSearchLimit: 12, // Increased from 8 to 12
  titleSearchMinWordLength: 2,
  contentSearchBatchSize: 4 // Increased from 3 to 4
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
