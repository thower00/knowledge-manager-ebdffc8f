
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, FileText } from "lucide-react";

interface ExtractedTextPreviewProps {
  extractionText: string;
  showExtractedText: boolean;
  setShowExtractedText: (show: boolean) => void;
}

export const ExtractedTextPreview = ({
  extractionText,
  showExtractedText,
  setShowExtractedText,
}: ExtractedTextPreviewProps) => {
  // Ensure there's actual content to display
  const hasContent = extractionText && extractionText.trim().length > 0;
  
  // Debug the content we're receiving
  console.log("ExtractedTextPreview received text:", {
    length: extractionText?.length || 0,
    sample: extractionText?.substring(0, 100),
    hasContent
  });
  
  if (!hasContent) return null;
  
  return (
    <div className="mt-4 p-4 border rounded-md bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-medium">Extracted Text Preview</h3>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowExtractedText(!showExtractedText)}
          className="h-8 px-2"
        >
          {showExtractedText ? (
            <>
              <X className="h-4 w-4 mr-1" /> Hide
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-1" /> Show
            </>
          )}
        </Button>
      </div>
      
      {showExtractedText && (
        <ScrollArea className="h-96">
          <pre className="whitespace-pre-wrap font-mono text-sm p-3 border rounded bg-white">
            {extractionText}
          </pre>
        </ScrollArea>
      )}
    </div>
  );
};
