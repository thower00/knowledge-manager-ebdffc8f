
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface VectorStats {
  total_embeddings: number;
  unique_documents: number;
  providers: string[];
  models: string[];
}

interface EmbeddingRecord {
  id: string;
  document_id: string;
  chunk_id: string;
  embedding_model: string;
  embedding_provider: string;
  similarity_threshold: number | null;
  created_at: string;
  vector_dimensions: number;
}

export function useVectorDatabase() {
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [embeddings, setEmbeddings] = useState<EmbeddingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeleteDocumentDialogOpen, setIsDeleteDocumentDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const { toast } = useToast();

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_vector_stats');
      if (error) throw error;
      setStats(data);
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
      const { data, error } = await supabase
        .from('document_embeddings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setEmbeddings(data || []);
    } catch (error) {
      console.error('Error loading embeddings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load recent embeddings"
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
      const { error } = await supabase.rpc('clear_all_embeddings');
      if (error) throw error;
      
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
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);
      
      if (error) throw error;
      
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

  const handleDeleteAll = useCallback(() => {
    setIsDeleteAllDialogOpen(true);
  }, []);

  const handleDeleteDocument = useCallback((documentId: string) => {
    setSelectedDocumentId(documentId);
    setIsDeleteDocumentDialogOpen(true);
  }, []);

  const confirmDeleteAll = useCallback(async () => {
    await clearAllEmbeddings();
    setIsDeleteAllDialogOpen(false);
  }, [clearAllEmbeddings]);

  const confirmDeleteDocument = useCallback(async () => {
    if (selectedDocumentId) {
      await clearDocumentEmbeddings(selectedDocumentId);
      setIsDeleteDocumentDialogOpen(false);
      setSelectedDocumentId("");
    }
  }, [selectedDocumentId, clearDocumentEmbeddings]);

  useEffect(() => {
    loadVectorData();
  }, [loadVectorData]);

  return {
    stats,
    embeddings,
    isLoading,
    isClearing,
    isDeleteDialogOpen,
    isDeleteAllDialogOpen,
    isDeleteDocumentDialogOpen,
    selectedDocumentId,
    setSelectedDocumentId,
    loadStats,
    loadEmbeddings,
    loadVectorData,
    handleDeleteAll,
    handleDeleteDocument,
    setIsDeleteDialogOpen,
    setIsDeleteAllDialogOpen,
    setIsDeleteDocumentDialogOpen,
    confirmDeleteAll,
    confirmDeleteDocument,
    clearDocumentEmbeddings,
    clearAllEmbeddings
  };
}
