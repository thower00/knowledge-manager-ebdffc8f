
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractedTextPreviewProps {
  extractionText: string;
  showExtractedText: boolean;
  setShowExtractedText: (show: boolean) => void;
  sourceInfo?: string;
}

export function ExtractedTextPreview({ 
  extractionText, 
  showExtractedText, 
  setShowExtractedText,
  sourceInfo 
}: ExtractedTextPreviewProps) {
  const { toast } = useToast();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(extractionText);
      toast({
        title: "Copied to clipboard",
        description: "Extracted text has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy text to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([extractionText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-text-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "Extracted text file is being downloaded",
    });
  };

  if (!extractionText) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              Extracted Text Results
              {sourceInfo && (
                <Badge variant="outline" className="text-xs">
                  {sourceInfo}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {extractionText.length.toLocaleString()} characters extracted
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadText}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExtractedText(!showExtractedText)}
            >
              {showExtractedText ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {showExtractedText && (
        <CardContent>
          <div className="bg-muted p-4 rounded-md max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {extractionText}
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
