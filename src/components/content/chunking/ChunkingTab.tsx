import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentSelector } from "./DocumentSelector";
import { ChunkingPreview } from "./ChunkingPreview";
import { ChunkingControls } from "./ChunkingControls";
import { ChunkingResults } from "./ChunkingResults";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments } from "../utils/documentDbService";
import { useToast } from "@/components/ui/use-toast";
import { ChunkingConfig } from "@/types/chunking";
import { supabase } from "@/integrations/supabase/client";

export function ChunkingTab() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunkingResults, setChunkingResults] = useState<any[]>([]);
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  
  // Default chunking configuration
  const [chunkingConfig, setChunkingConfig] = useState<ChunkingConfig>({
    chunkSize: 1000,
    chunkOverlap: 200,
    chunkStrategy: "fixed_size",
  });

  // Load documents and configuration when component mounts
  useEffect(() => {
    console.log("ChunkingTab - Initial mount");
    loadDocuments();
    loadChunkingConfig();
    
    // Mark component as initialized after loading
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
      console.log("ChunkingTab fully initialized");
    }, 1000);
    
    return () => clearTimeout(initTimer);
  }, []);

  // Ensure data is loaded when tab becomes visible
  useEffect(() => {
    if (isInitialized) {
      console.log("ChunkingTab is already initialized, ensuring data is loaded");
      if (documents.length === 0 && !isLoading) {
        console.log("No documents loaded yet, reloading...");
        loadDocuments();
      }
    }
  }, [isInitialized, documents.length, isLoading]);

  const loadDocuments = async () => {
    console.log("ChunkingTab - Loading documents");
    setIsLoading(true);
    try {
      const docs = await fetchProcessedDocuments();
      console.log(`ChunkingTab - Fetched ${docs.length} documents`);
      
      // Only show completed documents that can be chunked
      const completedDocs = docs.filter(doc => doc.status === 'completed');
      setDocuments(completedDocs);
    } catch (err) {
      console.error("Error loading documents for chunking:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load processed documents",
      });
    } finally {
      setIsLoading(false);
      console.log("ChunkingTab - Documents loading complete");
    }
  };

  const loadChunkingConfig = async () => {
    console.log("ChunkingTab - Loading chunking configuration");
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('value')
        .eq('key', 'document_processing')
        .maybeSingle();

      if (error) {
        console.error("Error fetching configuration:", error);
        return;
      }

      if (data?.value) {
        const configValue = data.value as any;
        console.log("ChunkingTab - Found configuration:", configValue);
        
        setChunkingConfig({
          chunkSize: parseInt(configValue.chunkSize) || 1000,
          chunkOverlap: parseInt(configValue.chunkOverlap) || 200,
          chunkStrategy: configValue.chunkStrategy as ChunkingConfig["chunkStrategy"] || "fixed_size",
        });
      } else {
        console.log("ChunkingTab - No configuration found, using defaults");
      }
    } catch (err) {
      console.error("Error loading chunking configuration:", err);
    }
  };

  const handleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedDocuments(documents.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleChunkingConfigChange = (config: Partial<ChunkingConfig>) => {
    setChunkingConfig(prev => ({
      ...prev,
      ...config
    }));
  };

  const handlePreviewChunking = (documentId: string) => {
    setPreviewDocument(documentId);
  };

  const handleProcessChunking = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        variant: "destructive",
        title: "No Documents Selected",
        description: "Please select at least one document to chunk",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // This would call an API to perform the actual chunking
      // For now, we'll simulate the process
      
      setTimeout(() => {
        // Generate mock results
        const results = selectedDocuments.map(docId => {
          const doc = documents.find(d => d.id === docId);
          return {
            documentId: docId,
            documentTitle: doc?.title || "Unknown document",
            chunkCount: Math.floor(Math.random() * 10) + 5,
            success: true,
          };
        });
        
        setChunkingResults(results);
        
        toast({
          title: "Chunking Complete",
          description: `Successfully chunked ${results.length} document(s)`,
        });
        
        setIsProcessing(false);
      }, 2000);
      
    } catch (err) {
      console.error("Error chunking documents:", err);
      toast({
        variant: "destructive",
        title: "Chunking Failed",
        description: "An error occurred while chunking documents",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Chunking</CardTitle>
          <CardDescription>
            Break down documents into smaller chunks for better processing and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Documents</h3>
              <DocumentSelector 
                documents={documents}
                selectedDocuments={selectedDocuments}
                onSelectDocument={handleDocumentSelection}
                onSelectAll={handleSelectAll}
                onPreview={handlePreviewChunking}
                isLoading={isLoading}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Chunking Configuration</h3>
              <ChunkingControls 
                config={chunkingConfig}
                onChange={handleChunkingConfigChange}
                onProcess={handleProcessChunking}
                selectedCount={selectedDocuments.length}
                isProcessing={isProcessing}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {previewDocument && (
        <ChunkingPreview 
          documentId={previewDocument}
          config={chunkingConfig}
          onClose={() => setPreviewDocument(null)}
        />
      )}
      
      {chunkingResults.length > 0 && (
        <ChunkingResults results={chunkingResults} />
      )}
    </div>
  );
}
