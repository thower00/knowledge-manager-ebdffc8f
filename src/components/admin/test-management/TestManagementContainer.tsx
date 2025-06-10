
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
                <ExtractionTab />
              </TabsContent>
              
              <TabsContent value="chunking" className="mt-6">
                <ChunkingTab />
              </TabsContent>
              
              <TabsContent value="embeddings" className="mt-6">
                <EmbeddingsTab isLoading={false} onRunTest={setTestResults} />
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
