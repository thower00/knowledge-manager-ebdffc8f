
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { validatePdfUrl, convertGoogleDriveUrl } from "@/components/admin/document-extraction/utils/urlUtils";

export const useUrlValidation = () => {
  const [testUrl, setTestUrl] = useState("");
  const [testUrlError, setTestUrlError] = useState<string | null>(null);
  const [testUrlValid, setTestUrlValid] = useState<boolean>(false);
  const { toast } = useToast();

  // Validate URL when it changes
  useEffect(() => {
    if (testUrl) {
      validateUrl(testUrl);
    }
  }, [testUrl]);

  const validateUrl = (url: string) => {
    // Reset error and valid states first
    setTestUrlError(null);
    setTestUrlValid(false);
    
    if (!url) return true;
    
    // Use our validation utility
    const { isValid, message } = validatePdfUrl(url);
    
    if (!isValid && message) {
      setTestUrlError(message);
      return false;
    }
    
    // URL is valid
    setTestUrlValid(true);
    
    // Check if we can convert Google Drive URL to a better format
    const { url: convertedUrl, wasConverted } = convertGoogleDriveUrl(url);
    if (wasConverted) {
      setTestUrl(convertedUrl);
      toast({
        title: "URL Improved",
        description: "The Google Drive URL has been converted to direct download format.",
        variant: "default"
      });
    }
    
    return true;
  };

  return {
    testUrl,
    setTestUrl,
    testUrlError,
    testUrlValid,
    validateUrl
  };
};
