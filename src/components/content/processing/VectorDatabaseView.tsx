
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Database, Trash2, FileText, RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddingDbService } from "@/components/content/utils/embeddingDbService";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export function VectorDatabaseView() {
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [embeddings, setEmbeddings] = useState<EmbeddingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [showClearDocDialog, setShowClearDocDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const { toast } = useToast();

  const loadVectorData = async () => {
    setIsLoading(true);
    try {
      console.log("Loading vector database statistics and records...");
      
      // Load statistics
      const statsData = await EmbeddingDbService.getEmbeddingStats();
      setStats(statsData);
      
      // Load recent embeddings for verification
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

      // Process embeddings to include vector dimensions
      const processedEmbeddings = (embeddingData || []).map(item => ({
        id: item.id,
        document_id: item.document_id,
        chunk_id: item.chunk_id,
        embedding_model: item.embedding_model,
        embedding_provider: item.embedding_provider,
        similarity_threshold: item.similarity_threshold,
        created_at: item.created_at,
        vector_dimensions: item.embedding_vector ? 
          (typeof item.embedding_vector === 'string' ? 
            JSON.parse(item.embedding_vector).length : 
            Array.isArray(item.embedding_vector) ? item.embedding_vector.length : 0) : 0
      }));

      setEmbeddings(processedEmbeddings);
      
      toast({
        title: "Vector Data Loaded",
        description: `Found ${statsData.total_embeddings} embeddings across ${statsData.unique_documents} documents`,
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

  const clearAllEmbeddings = async () => {
    setIsClearing(true);
    try {
      console.log("Clearing all embeddings from vector database...");
      
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        throw new Error(`Failed to clear embeddings: ${error.message}`);
      }

      await loadVectorData(); // Refresh data
      
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
      setIsClearing(false);
      setShowClearAllDialog(false);
    }
  };

  const clearDocumentEmbeddings = async (documentId: string) => {
    setIsClearing(true);
    try {
      console.log(`Clearing embeddings for document: ${documentId}`);
      
      const success = await EmbeddingDbService.deleteDocumentEmbeddings(documentId);
      
      if (success) {
        await loadVectorData(); // Refresh data
        
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
      setIsClearing(false);
      setShowClearDocDialog(false);
      setSelectedDocumentId("");
    }
  };

  useEffect(() => {
    loadVectorData();
  }, []);

  const uniqueDocuments = [...new Set(embeddings.map(e => e.document_id))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Vector Database Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.total_embeddings}</div>
              <div className="text-sm text-muted-foreground">Total Embeddings</div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.unique_documents}</div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.providers.length}</div>
              <div className="text-sm text-muted-foreground">Providers</div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.models.length}</div>
              <div className="text-sm text-muted-foreground">Models</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={loadVectorData}
            disabled={isLoading}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={() => setShowClearAllDialog(true)}
            disabled={isClearing || !stats?.total_embeddings}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Embeddings
          </Button>
        </div>

        {/* Provider and Model Info */}
        {stats && (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Active Providers:</h4>
              <div className="flex flex-wrap gap-2">
                {stats.providers.map(provider => (
                  <Badge key={provider} variant="secondary">
                    {provider}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Models in Use:</h4>
              <div className="flex flex-wrap gap-2">
                {stats.models.map(model => (
                  <Badge key={model} variant="outline">
                    {model}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Document-specific cleanup */}
        {uniqueDocuments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Clear Embeddings by Document:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {uniqueDocuments.slice(0, 10).map(docId => {
                const docEmbeddings = embeddings.filter(e => e.document_id === docId);
                return (
                  <div key={docId} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono truncate">{docId}</div>
                      <div className="text-xs text-muted-foreground">
                        {docEmbeddings.length} embeddings
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedDocumentId(docId);
                        setShowClearDocDialog(true);
                      }}
                      disabled={isClearing}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Embeddings Table */}
        {embeddings.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Embeddings (Last 50):</h4>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Provider</th>
                      <th className="text-left p-2">Model</th>
                      <th className="text-left p-2">Dimensions</th>
                      <th className="text-left p-2">Threshold</th>
                      <th className="text-left p-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {embeddings.map(embedding => (
                      <tr key={embedding.id} className="border-t">
                        <td className="p-2">
                          <Badge variant="secondary" className="text-xs">
                            {embedding.embedding_provider}
                          </Badge>
                        </td>
                        <td className="p-2 truncate max-w-32">{embedding.embedding_model}</td>
                        <td className="p-2">{embedding.vector_dimensions}</td>
                        <td className="p-2">{embedding.similarity_threshold || 'N/A'}</td>
                        <td className="p-2">{new Date(embedding.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Dialog */}
        <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span>Clear All Embeddings</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete all {stats?.total_embeddings || 0} embeddings from the vector database. 
                This cannot be undone. You will need to reprocess all documents to regenerate the embeddings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={clearAllEmbeddings}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear All Embeddings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Document Dialog */}
        <AlertDialog open={showClearDocDialog} onOpenChange={setShowClearDocDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Document Embeddings</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all embeddings for the selected document. This action cannot be undone.
                Document ID: {selectedDocumentId}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedDocumentId("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clearDocumentEmbeddings(selectedDocumentId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear Document Embeddings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
