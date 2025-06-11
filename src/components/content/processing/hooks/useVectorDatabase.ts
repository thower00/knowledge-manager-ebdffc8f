
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddingDbService } from "@/components/content/utils/embeddingDbService";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeleteDocumentDialogOpen, setIsDeleteDocumentDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const { toast } = useToast();

  const loadStats = async () => {
    try {
      console.log("Loading vector database statistics...");
      const statsData = await EmbeddingDbService.getEmbeddingStats();
      setStats(statsData);
    } catch (error) {
      console.error("Error loading vector stats:", error);
      toast({
        variant: "destructive",
        title: "Error loading vector stats",
        description: error instanceof Error ? error.message : "Failed to load vector stats",
      });
    }
  };

  const loadEmbeddings = async () => {
    try {
      console.log("Loading recent embeddings...");
      const { data: embeddingData, error } = await supabase
        .from('document_embeddings')
        .select(`
          id,
          document_id,
          chunk_id,
          embedding_model,
          embedding_provider,
          similarity_threshold,
          created_at,
          embedding_vector
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Failed to load embeddings: ${error.message}`);
      }

      // Process embeddings to include vector dimensions with proper type checking
      const processedEmbeddings = (embeddingData || []).map(item => {
        let vectorDimensions = 0;
        
        // Handle the embedding_vector which could be string, array, or null/undefined
        const embeddingVector = item.embedding_vector as any;
        
        if (embeddingVector) {
          if (typeof embeddingVector === 'string') {
            try {
              const parsed = JSON.parse(embeddingVector);
              vectorDimensions = Array.isArray(parsed) ? parsed.length : 0;
            } catch {
              vectorDimensions = 0;
            }
          } else if (Array.isArray(embeddingVector)) {
            vectorDimensions = embeddingVector.length;
          }
        }

        return {
          id: item.id,
          document_id: item.document_id,
          chunk_id: item.chunk_id,
          embedding_model: item.embedding_model,
          embedding_provider: item.embedding_provider,
          similarity_threshold: item.similarity_threshold,
          created_at: item.created_at,
          vector_dimensions: vectorDimensions
        };
      });

      setEmbeddings(processedEmbeddings);
    } catch (error) {
      console.error("Error loading embeddings:", error);
      toast({
        variant: "destructive",
        title: "Error loading embeddings",
        description: error instanceof Error ? error.message : "Failed to load embeddings",
      });
    }
  };

  const loadVectorData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadStats(), loadEmbeddings()]);
      
      toast({
        title: "Vector Data Loaded",
        description: `Vector database data refreshed successfully`,
      });
    } catch (error) {
      console.error("Error loading vector data:", error);
      toast({
        variant: "destructive",
        title: "Error loading vector data",
        description: error instanceof Error ? error.message : "Failed to load vector data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = () => {
    setIsDeleteAllDialogOpen(true);
  };

  const handleDeleteDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setIsDeleteDocumentDialogOpen(true);
  };

  const confirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      console.log("Clearing all embeddings from vector database...");
      
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        throw new Error(`Failed to clear embeddings: ${error.message}`);
      }

      await loadVectorData();
      
      toast({
        title: "Vector Database Cleared",
        description: "All embeddings have been successfully removed",
      });
    } catch (error) {
      console.error("Error clearing embeddings:", error);
      toast({
        variant: "destructive",
        title: "Error clearing embeddings",
        description: error instanceof Error ? error.message : "Failed to clear embeddings",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteAllDialogOpen(false);
    }
  };

  const confirmDeleteDocument = async () => {
    if (!selectedDocumentId) return;

    setIsDeleting(true);
    try {
      console.log(`Clearing embeddings for document: ${selectedDocumentId}`);
      
      const success = await EmbeddingDbService.deleteDocumentEmbeddings(selectedDocumentId);
      
      if (success) {
        await loadVectorData();
        
        toast({
          title: "Document Embeddings Cleared",
          description: "Embeddings for the selected document have been removed",
        });
      } else {
        throw new Error("No embeddings found for the document");
      }
    } catch (error) {
      console.error("Error clearing document embeddings:", error);
      toast({
        variant: "destructive",
        title: "Error clearing document embeddings",
        description: error instanceof Error ? error.message : "Failed to clear document embeddings",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDocumentDialogOpen(false);
      setSelectedDocumentId("");
    }
  };

  // Legacy methods for compatibility
  const clearAllEmbeddings = confirmDeleteAll;
  const clearDocumentEmbeddings = async (documentId: string) => {
    setSelectedDocumentId(documentId);
    await confirmDeleteDocument();
  };

  useEffect(() => {
    loadVectorData();
  }, []);

  return {
    stats,
    embeddings,
    isLoading,
    isDeleting,
    isDeleteDialogOpen,
    isDeleteAllDialogOpen,
    isDeleteDocumentDialogOpen,
    selectedDocumentId,
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
    clearAllEmbeddings,
    clearDocumentEmbeddings,
  };
}
