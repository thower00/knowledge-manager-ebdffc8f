
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

interface ProcessingTabProps {
  isLoading: boolean;
  onRunTest: (data: { processingInput: string }) => void;
}

export function ProcessingTab({ isLoading, onRunTest }: ProcessingTabProps) {
  const [processingInput, setProcessingInput] = useState("");
  const { toast } = useToast();

  const handleTest = () => {
    onRunTest({ processingInput });
    toast({
      title: "Test completed",
      description: "Processing test completed successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Text Processing</CardTitle>
        <CardDescription>
          Verify text chunking and processing capabilities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Input Text for Processing</Label>
          <Textarea
            value={processingInput}
            onChange={(e) => setProcessingInput(e.target.value)}
            placeholder="Enter text to test processing functionality..."
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Chunk Size</Label>
            <Input type="number" defaultValue="1000" />
          </div>

          <div className="grid gap-2">
            <Label>Chunk Overlap</Label>
            <Input type="number" defaultValue="200" />
          </div>
        </div>

        <Button onClick={handleTest} disabled={isLoading}>
          {isLoading ? "Running..." : "Run Processing Test"}
        </Button>
      </CardContent>
    </Card>
  );
}
