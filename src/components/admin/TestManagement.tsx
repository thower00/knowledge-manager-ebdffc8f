
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TestManagement() {
  const [activeTab, setActiveTab] = useState("extraction");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [extractionText, setExtractionText] = useState("");
  const [embeddingInput, setEmbeddingInput] = useState("");
  const [processingInput, setProcessingInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai");
  const [dimension, setDimension] = useState("1536");
  const { toast } = useToast();

  const handleRunTest = async (testType: string) => {
    setIsLoading(true);
    setResult("");

    // Simulate test execution
    await new Promise((resolve) => setTimeout(resolve, 2000));

    switch (testType) {
      case "extraction":
        setResult(`
Document Title: Quarterly Report
Extracted Text: 
-----------------------------------------
${extractionText || "Sample extracted content from PDF file."}
-----------------------------------------
Content successfully extracted from document.
Extraction completed in 1.2 seconds.
`);
        break;
      case "processing":
        setResult(`
Processing Results:
-----------------------------------------
Input Length: ${processingInput.length} characters
Chunks Created: ${Math.ceil(processingInput.length / 200)}
Processing Time: 0.5 seconds
-----------------------------------------
Text successfully processed and chunked.
`);
        break;
      case "embeddings":
        setResult(`
Embedding Results:
-----------------------------------------
Model: ${selectedModel}
Dimensions: ${dimension}
Vector: [0.023, -0.112, 0.442, ... ${parseInt(dimension) - 3} more dimensions]
-----------------------------------------
Text successfully embedded into vector representation.
`);
        break;
      default:
        setResult("Unknown test type");
    }

    toast({
      title: "Test completed",
      description: `${testType
        .charAt(0)
        .toUpperCase()}${testType.slice(1)} test completed successfully`,
    });

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="extraction">Document Extraction</TabsTrigger>
          <TabsTrigger value="processing">Text Processing</TabsTrigger>
          <TabsTrigger value="embeddings">Vector Embeddings</TabsTrigger>
        </TabsList>

        <TabsContent value="extraction" className="mt-4 space-y-4">
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

              <Button
                onClick={() => handleRunTest("extraction")}
                disabled={isLoading}
              >
                {isLoading && activeTab === "extraction"
                  ? "Running..."
                  : "Run Extraction Test"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="mt-4 space-y-4">
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

              <Button
                onClick={() => handleRunTest("processing")}
                disabled={isLoading}
              >
                {isLoading && activeTab === "processing"
                  ? "Running..."
                  : "Run Processing Test"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embeddings" className="mt-4 space-y-4">
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
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                  >
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

              <Button
                onClick={() => handleRunTest("embeddings")}
                disabled={isLoading}
              >
                {isLoading && activeTab === "embeddings"
                  ? "Running..."
                  : "Run Embedding Test"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto whitespace-pre-wrap font-mono text-sm">
              {result}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
