import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractionTab } from "./tabs/extraction";
import { ChunkingTab } from "./tabs/ChunkingTab";
import { EmbeddingsTab } from "./tabs/EmbeddingsTab";
import { EmbeddingsTestTab } from "./tabs/EmbeddingsTestTab";
import { DatabaseTab } from "./tabs/DatabaseTab";
import { ConfigProvider } from "../document-processing/ConfigContext";
import { TestResultDisplay } from "./TestResultDisplay";
import { SelfTestTab } from "./tabs/self-test/SelfTestTab";
import { ToastsTab } from "./tabs/ToastsTab";
import { DiagnosticsTab } from "./tabs/DiagnosticsTab";
export function TestManagement() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractedFrom, setExtractedFrom] = useState<string>("");
  const [chunks, setChunks] = useState<Array<{
    index: number;
    content: string;
    size: number;
    startPosition?: number;
    endPosition?: number;
  }>>([]);

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

  // For ExtractionTab that handles its own loading and passes results directly
  const handleExtractionResult = (results: any) => {
    setTestResults(results);
    
    // Extract the text for use in other tabs
    if (results && typeof results === 'object') {
      if (results.extractedText) {
        setExtractedText(results.extractedText);
        setExtractedFrom(results.filename || results.source || "extraction");
        console.log("Extracted text set for chunking:", results.extractedText.length, "characters");
      } else if (results.data && results.data.extractedText) {
        setExtractedText(results.data.extractedText);
        setExtractedFrom(results.data.filename || results.data.source || "extraction");
        console.log("Extracted text set for chunking:", results.data.extractedText.length, "characters");
      }
    }
  };

  // For ChunkingTab that passes results directly and needs to store chunks
  const handleChunkingResult = (results: any) => {
    setTestResults(results);
    
    // Extract chunks for use in EmbeddingsTab
    if (results && results.status === 'success' && results.chunks) {
      const chunkData = results.chunks.map((chunk: any, index: number) => ({
        index: chunk.index || index,
        content: chunk.content || chunk.preview || "",
        size: chunk.size || (chunk.content ? chunk.content.length : 0),
        startPosition: chunk.startPosition,
        endPosition: chunk.endPosition
      }));
      setChunks(chunkData);
      console.log("Chunks set for embeddings:", chunkData.length, "chunks");
    }
  };

  // For EmbeddingsTab that passes results directly
  const handleEmbeddingResult = (results: any) => {
    setTestResults(results);
    console.log("Embedding results set:", results);
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
              <TabsList className="mb-4 w-full overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="extraction">Document Extraction</TabsTrigger>
                <TabsTrigger value="chunking">Text Chunking</TabsTrigger>
                <TabsTrigger value="embeddings">Embeddings Processing</TabsTrigger>
                <TabsTrigger value="embeddings-test">Embeddings Testing</TabsTrigger>
                <TabsTrigger value="self-test">E2E Test</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
                <TabsTrigger value="toasts">Toasts</TabsTrigger>
                <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="extraction" className="mt-6">
                <ExtractionTab isLoading={false} onRunTest={handleExtractionResult} />
              </TabsContent>
              
              <TabsContent value="chunking" className="mt-6">
                <ChunkingTab 
                  isLoading={isLoading} 
                  onRunTest={handleChunkingResult}
                  extractedText={extractedText}
                  extractedFrom={extractedFrom}
                />
              </TabsContent>
              
              <TabsContent value="embeddings" className="mt-6">
                <EmbeddingsTab 
                  isLoading={isLoading} 
                  onRunTest={handleEmbeddingResult}
                  chunks={chunks}
                  sourceDocument={extractedFrom}
                />
              </TabsContent>

              <TabsContent value="embeddings-test" className="mt-6">
                <EmbeddingsTestTab />
              </TabsContent>

              <TabsContent value="self-test" className="mt-6">
                <SelfTestTab />
              </TabsContent>

              <TabsContent value="database" className="mt-6">
                <DatabaseTab 
                  isLoading={isLoading} 
                  onRunTest={handleTestComplete}
                />
              </TabsContent>

              <TabsContent value="toasts" className="mt-6">
                <ToastsTab />
              </TabsContent>

              <TabsContent value="diagnostics" className="mt-6">
                <DiagnosticsTab />
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
