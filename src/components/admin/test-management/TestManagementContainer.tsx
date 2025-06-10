
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmbeddingsTab } from "./tabs/EmbeddingsTab";
import { ChunkingTab } from "./tabs/ChunkingTab";
import { ExtractionTab } from "./tabs/extraction";
import { TestResultDisplay } from "./TestResultDisplay";
import { useState } from "react";

export function TestManagement() {
  const [activeTab, setActiveTab] = useState("extraction");
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractedFrom, setExtractedFrom] = useState<string>("");
  
  const handleRunTest = (data: any) => {
    setIsTestRunning(true);
    
    try {
      const result = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      setTestResult(result);
      
      // Capture extracted text from extraction tab
      if (data && data.extractedText) {
        setExtractedText(data.extractedText);
        setExtractedFrom(data.filename || data.source || "Document extraction");
        console.log("Captured extracted text:", data.extractedText.length, "characters");
      }
    } catch (error) {
      console.error("Error processing test result:", error);
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs 
        defaultValue="extraction" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="extraction">Document Extraction</TabsTrigger>
          <TabsTrigger value="chunking">Chunking</TabsTrigger>
          <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="extraction">
          <ExtractionTab 
            isLoading={isTestRunning} 
            onRunTest={handleRunTest} 
          />
        </TabsContent>
        
        <TabsContent value="chunking">
          <ChunkingTab 
            isLoading={isTestRunning} 
            onRunTest={handleRunTest}
            extractedText={extractedText}
            extractedFrom={extractedFrom}
          />
        </TabsContent>
        
        <TabsContent value="embeddings">
          <EmbeddingsTab 
            isLoading={isTestRunning} 
            onRunTest={handleRunTest} 
          />
        </TabsContent>
      </Tabs>
      
      {testResult && (
        <TestResultDisplay result={testResult} />
      )}
    </div>
  );
}
