import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmbeddingsTab } from "./tabs/EmbeddingsTab";
import { ProcessingTab } from "./tabs/ProcessingTab";
import { ExtractionTab } from "./tabs/ExtractionTab";
import { TestResultDisplay } from "./TestResultDisplay";
import { useState } from "react";

export function TestManagement() {
  const [activeTab, setActiveTab] = useState("extraction"); // Changed default to extraction
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  
  const handleRunTest = (data: any) => {
    setIsTestRunning(true);
    
    // Process test data based on the active tab
    try {
      // Handle results for different tabs
      if (activeTab === "processing") {
        setTestResult(JSON.stringify(data, null, 2));
      } else if (activeTab === "extraction" || activeTab === "embeddings") {
        // For extraction or embeddings, just show what we received
        const result = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
        setTestResult(result);
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
          <TabsTrigger value="processing">Document Processing</TabsTrigger>
          <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="extraction">
          <ExtractionTab 
            isLoading={isTestRunning} 
            onRunTest={handleRunTest} 
          />
        </TabsContent>
        
        <TabsContent value="processing">
          <ProcessingTab 
            isLoading={isTestRunning} 
            onRunTest={handleRunTest}
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
