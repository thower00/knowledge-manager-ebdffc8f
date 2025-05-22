
import { useState } from "react";
import { ExtractionOptionsType } from "../ExtractionOptions";

export const useExtractionOptions = () => {
  // Initialize extraction options with sensible defaults
  const [extractionOptions, setExtractionOptions] = useState<ExtractionOptionsType>({
    extractFirstPagesOnly: false,
    pageLimit: 10,
    timeout: 60,
    extractionMode: "progressive"
  });

  return {
    extractionOptions,
    setExtractionOptions
  };
};
