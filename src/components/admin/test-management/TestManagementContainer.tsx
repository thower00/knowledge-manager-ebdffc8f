
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractionTab } from "./tabs/extraction";
import { ChunkingTab } from "./tabs/ChunkingTab";
import { EmbeddingsTab } from "./tabs/EmbeddingsTab";
import { EmbeddingsTestTab } from "./tabs/EmbeddingsTestTab";
import { ConfigProvider } from "../document-processing/ConfigContext";
import { TestResultDisplay } from "./TestResultDisplay";

export function TestManagement() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestComplete = (results: any) => {
    setTestResults(results);
    setIsLoading(false);
  };

  // For tabs that need the callback pattern (ChunkingTab, EmbeddingsTab)
  const handleRunTest = (callback: () => Promise<any>) => {
    setIsLoading(true);
    callback().then(handleTestComplete).catch((error) => {
      console.error('Test failed:', error);
      setIsLoading(false);
    });
  };

  // For tabs that handle their own loading and just pass results (ExtractionTab)
  const handleDirectResult = (results: any) => {
    setTestResults(results);
  };

  return (
    <ConfigProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>System Testing & Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="extraction" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="extraction">Document Extraction</TabsTrigger>
                <TabsTrigger value="chunking">Text Chunking</TabsTrigger>
                <TabsTrigger value="embeddings">Embeddings Processing</TabsTrigger>
                <TabsTrigger value="embeddings-test">Embeddings Testing</TabsTrigger>
              </TabsList>
              
              <TabsContent value="extraction" className="mt-6">
                <ExtractionTab isLoading={false} onRunTest={handleDirectResult} />
              </TabsContent>
              
              <TabsContent value="chunking" className="mt-6">
                <ChunkingTab isLoading={isLoading} onRunTest={handleRunTest} />
              </TabsContent>
              
              <TabsContent value="embeddings" className="mt-6">
                <EmbeddingsTab isLoading={isLoading} onRunTest={setTestResults} />
              </TabsContent>

              <TabsContent value="embeddings-test" className="mt-6">
                <EmbeddingsTestTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {testResults && (
          <TestResultDisplay result={testResults} />
        )}
      </div>
    </ConfigProvider>
  );
}
