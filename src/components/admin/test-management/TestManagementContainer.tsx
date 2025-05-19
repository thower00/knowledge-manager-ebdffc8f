
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentExtraction } from "../document-extraction/DocumentExtraction";
import { ExtractionTab } from "./tabs/ExtractionTab";
import { ProcessingTab } from "./tabs/ProcessingTab";
import { EmbeddingsTab } from "./tabs/EmbeddingsTab";
import { TestResultDisplay } from "./TestResultDisplay";

export function TestManagement() {
  const [activeTab, setActiveTab] = useState("extraction");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleRunTest = async (testType: string, testData: any) => {
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
${testData.extractionText || "Sample extracted content from PDF file."}
-----------------------------------------
Content successfully extracted from document.
Extraction completed in 1.2 seconds.
`);
        break;
      case "processing":
        setResult(`
Processing Results:
-----------------------------------------
Input Length: ${testData.processingInput.length} characters
Chunks Created: ${Math.ceil(testData.processingInput.length / 200)}
Processing Time: 0.5 seconds
-----------------------------------------
Text successfully processed and chunked.
`);
        break;
      case "embeddings":
        setResult(`
Embedding Results:
-----------------------------------------
Model: ${testData.selectedModel}
Dimensions: ${testData.dimension}
Vector: [0.023, -0.112, 0.442, ... ${parseInt(testData.dimension) - 3} more dimensions]
-----------------------------------------
Text successfully embedded into vector representation.
`);
        break;
      default:
        setResult("Unknown test type");
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="extraction">Document Extraction</TabsTrigger>
          <TabsTrigger value="processing">Text Processing</TabsTrigger>
          <TabsTrigger value="embeddings">Vector Embeddings</TabsTrigger>
          <TabsTrigger value="pdf-extraction">PDF Extraction</TabsTrigger>
        </TabsList>

        <TabsContent value="extraction" className="mt-4 space-y-4">
          <ExtractionTab 
            isLoading={isLoading && activeTab === "extraction"} 
            onRunTest={(data) => handleRunTest("extraction", data)} 
          />
        </TabsContent>

        <TabsContent value="processing" className="mt-4 space-y-4">
          <ProcessingTab 
            isLoading={isLoading && activeTab === "processing"} 
            onRunTest={(data) => handleRunTest("processing", data)} 
          />
        </TabsContent>

        <TabsContent value="embeddings" className="mt-4 space-y-4">
          <EmbeddingsTab 
            isLoading={isLoading && activeTab === "embeddings"} 
            onRunTest={(data) => handleRunTest("embeddings", data)} 
          />
        </TabsContent>

        <TabsContent value="pdf-extraction" className="mt-4 space-y-4">
          <DocumentExtraction />
        </TabsContent>
      </Tabs>

      {result && <TestResultDisplay result={result} />}
    </div>
  );
}
