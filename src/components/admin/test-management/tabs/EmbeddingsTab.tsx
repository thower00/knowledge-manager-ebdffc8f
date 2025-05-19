
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmbeddingsTabProps {
  isLoading: boolean;
  onRunTest: (data: { embeddingInput: string; selectedModel: string; dimension: string }) => void;
}

export function EmbeddingsTab({ isLoading, onRunTest }: EmbeddingsTabProps) {
  const [embeddingInput, setEmbeddingInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai");
  const [dimension, setDimension] = useState("1536");
  const { toast } = useToast();

  const handleTest = () => {
    onRunTest({ embeddingInput, selectedModel, dimension });
    toast({
      title: "Test completed",
      description: "Embedding test completed successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Vector Embeddings</CardTitle>
        <CardDescription>
          Verify text-to-vector embedding functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Input Text for Embedding</Label>
          <Textarea
            value={embeddingInput}
            onChange={(e) => setEmbeddingInput(e.target.value)}
            placeholder="Enter text to convert to vector embeddings..."
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Embedding Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="cohere">Cohere</SelectItem>
                <SelectItem value="huggingface">HuggingFace</SelectItem>
                <SelectItem value="local">Local Model</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Dimensions</Label>
            <Select value={dimension} onValueChange={setDimension}>
              <SelectTrigger>
                <SelectValue placeholder="Select dimensions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="768">768</SelectItem>
                <SelectItem value="1024">1024</SelectItem>
                <SelectItem value="1536">1536</SelectItem>
                <SelectItem value="2048">2048</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleTest} disabled={isLoading}>
          {isLoading ? "Running..." : "Run Embedding Test"}
        </Button>
      </CardContent>
    </Card>
  );
}
