
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

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: { extractionText: string }) => void;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  const [extractionText, setExtractionText] = useState("");
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

        <Button onClick={handleTest} disabled={isLoading}>
          {isLoading ? "Running..." : "Run Extraction Test"}
        </Button>
      </CardContent>
    </Card>
  );
}
