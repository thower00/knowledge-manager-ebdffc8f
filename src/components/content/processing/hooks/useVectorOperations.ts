
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { VectorDatabaseService } from "./services/vectorDatabaseService";
import { VectorStats, EmbeddingRecord } from "./types/vectorTypes";

export function useVectorOperations() {
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [embeddings, setEmbeddings] = useState<EmbeddingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const loadStats = useCallback(async () => {
    try {
      const newStats = await VectorDatabaseService.loadStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error loading vector stats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load vector database statistics"
      });
    }
  }, [toast]);

  const loadEmbeddings = useCallback(async () => {
    try {
      const newEmbeddings = await VectorDatabaseService.loadEmbeddings();
      setEmbeddings(newEmbeddings);
    } catch (error) {
      console.error('Error loading embeddings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load embeddings"
      });
    }
  }, [toast]);

  const loadVectorData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadStats(), loadEmbeddings()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadStats, loadEmbeddings]);

  const clearAllEmbeddings = useCallback(async () => {
    setIsClearing(true);
    try {
      await VectorDatabaseService.clearAllEmbeddings();
      
      toast({
        title: "Success",
        description: "All embeddings cleared successfully"
      });
      
      await loadVectorData();
    } catch (error) {
      console.error('Error clearing embeddings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear embeddings"
      });
    } finally {
      setIsClearing(false);
    }
  }, [toast, loadVectorData]);

  const clearDocumentEmbeddings = useCallback(async (documentId: string) => {
    setIsClearing(true);
    try {
      await VectorDatabaseService.clearDocumentEmbeddings(documentId);
      
      toast({
        title: "Success",
        description: "Document embeddings cleared successfully"
      });
      
      await loadVectorData();
    } catch (error) {
      console.error('Error clearing document embeddings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear document embeddings"
      });
    } finally {
      setIsClearing(false);
    }
  }, [toast, loadVectorData]);

  return {
    stats,
    embeddings,
    isLoading,
    isClearing,
    loadStats,
    loadEmbeddings,
    loadVectorData,
    clearAllEmbeddings,
    clearDocumentEmbeddings,
  };
}
