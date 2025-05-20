
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface UrlExtractionInputProps {
  testUrl: string;
  setTestUrl: (url: string) => void;
  testUrlValid: boolean;
  testUrlError: string | null;
  handleExtractFromUrl: () => void;
  isExtracting: boolean;
}

export const UrlExtractionInput = ({
  testUrl,
  setTestUrl,
  testUrlValid,
  testUrlError,
  handleExtractFromUrl,
  isExtracting,
}: UrlExtractionInputProps) => {
  return (
    <div className="grid gap-2">
      <Label>Or enter PDF URL for extraction test</Label>
      <Input
        type="url"
        value={testUrl}
        onChange={(e) => setTestUrl(e.target.value)}
        placeholder="https://example.com/sample.pdf"
        className={testUrlValid ? "border-green-400 focus-visible:ring-green-400" : ""}
      />
      
      {testUrlValid && (
        <Alert variant="default" className="bg-green-50 border-green-300 text-green-800 mt-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2">URL appears to be a valid PDF link</AlertDescription>
        </Alert>
      )}
      
      {testUrlError && (
        <Alert variant="warning" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">{testUrlError}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={handleExtractFromUrl} 
        disabled={!testUrlValid || isExtracting}
        variant="outline"
      >
        {isExtracting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Extracting from URL...
          </>
        ) : (
          "Extract from URL"
        )}
      </Button>
    </div>
  );
};
