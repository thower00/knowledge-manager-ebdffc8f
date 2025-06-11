
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  BarChart3
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VectorStats } from "./components/VectorStats";
import { VectorControls } from "./components/VectorControls";
import { RecentEmbeddingsTable } from "./components/RecentEmbeddingsTable";
import { useVectorDatabase } from "./hooks/useVectorDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function VectorDatabaseView() {
  const {
    stats,
    embeddings,
    isLoading,
    isClearing,
    loadVectorData,
    clearAllEmbeddings,
    clearDocumentEmbeddings,
  } = useVectorDatabase();

  const { toast } = useToast();

  const clearCompleteDatabase = async () => {
    try {
      console.log('Starting complete database reset from VectorDatabaseView...');
      
      // Get initial counts for verification
      const { count: initialEmbeddings } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true });
      
      const { count: initialChunks } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true });
      
      const { count: initialDocs } = await supabase
        .from('processed_documents')
        .select('*', { count: 'exact', head: true });

      console.log(`Initial counts - Embeddings: ${initialEmbeddings}, Chunks: ${initialChunks}, Documents: ${initialDocs}`);

      // Use RPC call to delete all records from each table
      console.log('Deleting all embeddings using RPC...');
      const { error: embeddingsError } = await supabase.rpc('delete_all_embeddings');
      
      if (embeddingsError) {
        console.error('RPC delete embeddings failed, trying direct delete...');
        // Fallback to direct delete with a range that should match all UUIDs
        const { data: allEmbeddings } = await supabase
          .from('document_embeddings')
          .select('id')
          .limit(1000);
        
        if (allEmbeddings && allEmbeddings.length > 0) {
          const embeddingIds = allEmbeddings.map(e => e.id);
          const { error: directDeleteError } = await supabase
            .from('document_embeddings')
            .delete()
            .in('id', embeddingIds);
          
          if (directDeleteError) {
            throw new Error(`Failed to delete embeddings: ${directDeleteError.message}`);
          }
        }
      }

      console.log('Deleting all chunks using RPC...');
      const { error: chunksError } = await supabase.rpc('delete_all_chunks');
      
      if (chunksError) {
        console.error('RPC delete chunks failed, trying direct delete...');
        // Fallback to direct delete
        const { data: allChunks } = await supabase
          .from('document_chunks')
          .select('id')
          .limit(1000);
        
        if (allChunks && allChunks.length > 0) {
          const chunkIds = allChunks.map(c => c.id);
          const { error: directDeleteError } = await supabase
            .from('document_chunks')
            .delete()
            .in('id', chunkIds);
          
          if (directDeleteError) {
            throw new Error(`Failed to delete chunks: ${directDeleteError.message}`);
          }
        }
      }

      console.log('Deleting all processed documents using RPC...');
      const { error: docsError } = await supabase.rpc('delete_all_documents');
      
      if (docsError) {
        console.error('RPC delete documents failed, trying direct delete...');
        // Fallback to direct delete
        const { data: allDocs } = await supabase
          .from('processed_documents')
          .select('id')
          .limit(1000);
        
        if (allDocs && allDocs.length > 0) {
          const docIds = allDocs.map(d => d.id);
          const { error: directDeleteError } = await supabase
            .from('processed_documents')
            .delete()
            .in('id', docIds);
          
          if (directDeleteError) {
            throw new Error(`Failed to delete documents: ${directDeleteError.message}`);
          }
        }
      }

      // Verify deletion by counting remaining records
      const { count: remainingEmbeddings } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true });
      
      const { count: remainingChunks } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true });
      
      const { count: remainingDocs } = await supabase
        .from('processed_documents')
        .select('*', { count: 'exact', head: true });

      console.log(`Verification - Remaining counts: Embeddings: ${remainingEmbeddings}, Chunks: ${remainingChunks}, Documents: ${remainingDocs}`);

      if (remainingEmbeddings === 0 && remainingChunks === 0 && remainingDocs === 0) {
        console.log('Database reset completed successfully');
        toast({
          title: "Complete Database Reset Successful",
          description: `Successfully cleared all documents, chunks, and embeddings from the database`
        });
      } else {
        console.warn(`Warning: Some records remain - Embeddings: ${remainingEmbeddings}, Chunks: ${remainingChunks}, Documents: ${remainingDocs}`);
        toast({
          variant: "destructive",
          title: "Partial Reset",
          description: `Some records may remain. Embeddings: ${remainingEmbeddings}, Chunks: ${remainingChunks}, Documents: ${remainingDocs}`
        });
      }
      
      // Reload data to show empty database
      await loadVectorData();
      
    } catch (error) {
      console.error('Error clearing complete database:', error);
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Failed to clear database"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Vector Database Management</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadVectorData}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Load Vector Data
            </Button>
            
            {stats && stats.total_embeddings > 0 && (
              <>
                <Button
                  onClick={clearAllEmbeddings}
                  disabled={isClearing}
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Embeddings Only
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={isClearing}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Complete Database
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Clear Complete Database
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete ALL documents, chunks, and embeddings from the database. 
                        This action cannot be undone.
                        
                        Are you absolutely sure you want to proceed?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearCompleteDatabase}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isClearing}
                      >
                        {isClearing ? 'Clearing...' : 'Yes, Clear Everything'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>

          <Separator />

          {stats && (
            <VectorStats stats={stats} />
          )}

          {embeddings.length > 0 && (
            <RecentEmbeddingsTable 
              embeddings={embeddings}
              onClearDocument={clearDocumentEmbeddings}
              isClearing={isClearing}
            />
          )}

          {!stats && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Load Vector Data" to view database information</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
