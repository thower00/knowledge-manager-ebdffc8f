
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: { extractionText: string }) => void;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  const [extractionText, setExtractionText] = useState("");
  const [testUrl, setTestUrl] = useState("");
  const [useTestUrl, setUseTestUrl] = useState(false);
  const { toast } = useToast();

  const handleTest = () => {
    onRunTest({ extractionText });
    toast({
      title: "Test completed",
      description: "Extraction test completed successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Document Extraction</CardTitle>
        <CardDescription>
          Verify document text extraction functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="use-test-url"
            checked={useTestUrl}
            onCheckedChange={setUseTestUrl}
          />
          <Label htmlFor="use-test-url">Test with direct PDF URL</Label>
        </div>

        {useTestUrl ? (
          <div className="grid gap-2">
            <Label>Enter PDF URL for extraction test</Label>
            <Input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://example.com/sample.pdf"
            />
            <p className="text-sm text-muted-foreground flex items-center">
              <Info className="h-4 w-4 mr-1 inline" />
              Enter direct URL to a PDF document (must be publicly accessible)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Upload Document (Disabled in Demo)</Label>
              <Input type="file" disabled />
              <p className="text-sm text-muted-foreground">
                In the actual app, you could upload PDF files here.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Or paste document text for extraction test</Label>
              <Textarea
                value={extractionText}
                onChange={(e) => setExtractionText(e.target.value)}
                placeholder="Paste document content to test extraction..."
                rows={5}
              />
            </div>
          </div>
        )}

        <Button onClick={handleTest} disabled={isLoading}>
          {isLoading ? "Running..." : "Run Extraction Test"}
        </Button>
      </CardContent>
    </Card>
  );
}
