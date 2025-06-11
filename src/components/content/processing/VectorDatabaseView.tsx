
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
      console.log('Starting complete database reset with direct queries...');
      
      // Get initial counts for detailed reporting
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

      let deletedEmbeddings = 0;
      let deletedChunks = 0;
      let deletedDocs = 0;

      // Step 1: Delete all embeddings using direct query
      console.log('Step 1: Deleting all embeddings...');
      const { error: embeddingError, count: embeddingDeleteCount } = await supabase
        .from('document_embeddings')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (embeddingError) {
        throw new Error(`Failed to delete embeddings: ${embeddingError.message}`);
      }
      deletedEmbeddings = embeddingDeleteCount || 0;
      console.log(`Deleted ${deletedEmbeddings} embeddings`);

      // Step 2: Delete all chunks using direct query
      console.log('Step 2: Deleting all chunks...');
      const { error: chunkError, count: chunkDeleteCount } = await supabase
        .from('document_chunks')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (chunkError) {
        throw new Error(`Failed to delete chunks: ${chunkError.message}`);
      }
      deletedChunks = chunkDeleteCount || 0;
      console.log(`Deleted ${deletedChunks} chunks`);

      // Step 3: Delete all documents using direct query
      console.log('Step 3: Deleting all documents...');
      const { error: docError, count: docDeleteCount } = await supabase
        .from('processed_documents')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (docError) {
        throw new Error(`Failed to delete documents: ${docError.message}`);
      }
      deletedDocs = docDeleteCount || 0;
      console.log(`Deleted ${deletedDocs} documents`);

      // Step 4: Verify deletion by counting remaining records
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
          description: `Successfully deleted ${deletedDocs} documents, ${deletedChunks} chunks, and ${deletedEmbeddings} embeddings`
        });
      } else {
        console.warn(`Warning: Some records remain - Embeddings: ${remainingEmbeddings}, Chunks: ${remainingChunks}, Documents: ${remainingDocs}`);
        toast({
          variant: "destructive",
          title: "Partial Reset",
          description: `Deleted some records but ${remainingDocs + remainingChunks + remainingEmbeddings} records remain`
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
