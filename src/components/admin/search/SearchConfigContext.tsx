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

// Enhanced default search configuration values for better factual question coverage
export const DEFAULT_SEARCH_CONFIG: SearchConfigSettings = {
  // Similarity Thresholds - Lower values for better recall, especially for factual questions
  factualQuestionThresholds: [0.05, 0.15, 0.25, 0.35, 0.45], // Lower thresholds for better coverage
  summaryRequestThresholds: [0.1, 0.2, 0.3, 0.4, 0.5],
  standardThresholds: [0.15, 0.25, 0.35, 0.45],
  
  // Match Count - Significantly increased for factual questions to capture complete information
  factualQuestionMatchCount: 40, // Increased from 25 to 40 for better coverage
  summaryMatchCount: 25,
  extensiveSummaryMatchCount: 30,
  standardMatchCount: 15,
  
  // Content Length - Increased for factual questions to capture more context
  factualQuestionContentLength: 5000, // Increased from 3000 to 5000
  summaryContentLength: 1800,
  extensiveSummaryContentLength: 2500,
  standardContentLength: 1500,
  
  // Processing Limits - Enhanced for factual questions to ensure document coverage
  factualQuestionChunksPerDocument: 15, // Increased from 8 to 15 for better document coverage
  summaryChunksPerDocument: 5,
  extensiveSummaryChunksPerDocument: 8,
  standardChunksPerDocument: 4,
  
  // Total chunks limit - Increased for factual questions
  factualQuestionTotalChunksLimit: 35, // Increased from 20 to 35
  summaryTotalChunksLimit: 15,
  extensiveSummaryTotalChunksLimit: 20,
  standardTotalChunksLimit: 12,
  
  // Additional parameters
  enhancedContentSearchLimit: 8, // Increased from 5
  titleSearchMinWordLength: 2,
  contentSearchBatchSize: 3 // Increased from 2
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
