
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
      console.log('=== STARTING COMPLETE DATABASE RESET ===');
      
      // First, get all document IDs for tracking
      const { data: documents } = await supabase
        .from('processed_documents')
        .select('id, title');

      console.log(`Found ${documents?.length || 0} documents to delete:`, documents?.map(d => d.title));

      let deletedEmbeddings = 0;
      let deletedChunks = 0;
      let deletedDocs = 0;

      // Step 1: Delete all embeddings
      console.log('=== STEP 1: DELETING EMBEDDINGS ===');
      try {
        const { error: embeddingError, count: embeddingCount } = await supabase
          .from('document_embeddings')
          .delete()
          .gte('id', '00000000-0000-0000-0000-000000000000');

        if (embeddingError) {
          console.error('Error deleting embeddings:', embeddingError);
        } else {
          deletedEmbeddings = embeddingCount || 0;
          console.log(`✓ Successfully deleted ${deletedEmbeddings} embeddings`);
        }
      } catch (error) {
        console.error('Exception deleting embeddings:', error);
      }

      // Step 2: Delete all chunks
      console.log('=== STEP 2: DELETING CHUNKS ===');
      try {
        const { error: chunkError, count: chunkCount } = await supabase
          .from('document_chunks')
          .delete()
          .gte('id', '00000000-0000-0000-0000-000000000000');

        if (chunkError) {
          console.error('Error deleting chunks:', chunkError);
        } else {
          deletedChunks = chunkCount || 0;
          console.log(`✓ Successfully deleted ${deletedChunks} chunks`);
        }
      } catch (error) {
        console.error('Exception deleting chunks:', error);
      }

      // Step 3: Delete all documents using the existing delete_documents function
      console.log('=== STEP 3: DELETING DOCUMENTS ===');
      try {
        if (documents && documents.length > 0) {
          const documentIds = documents.map(doc => doc.id);
          const { data: deleteResult, error: deleteError } = await supabase
            .rpc('delete_documents', { doc_ids: documentIds });

          if (deleteError) {
            console.error('Error with delete_documents function:', deleteError);
            
            // Fallback: try direct delete
            console.log('Trying direct delete for documents...');
            const { error: directError, count: directCount } = await supabase
              .from('processed_documents')
              .delete()
              .gte('id', '00000000-0000-0000-0000-000000000000');

            if (directError) {
              console.error('Direct delete failed:', directError);
            } else {
              deletedDocs = directCount || 0;
              console.log(`✓ Direct delete succeeded: ${deletedDocs} documents`);
            }
          } else if (deleteResult) {
            deletedDocs = documents.length;
            console.log(`✓ Successfully deleted ${deletedDocs} documents using RPC function`);
          }
        }
      } catch (error) {
        console.error('Exception deleting documents:', error);
      }

      // Final verification
      console.log('=== FINAL VERIFICATION ===');
      const { count: remainingEmbeddings } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true });
      
      const { count: remainingChunks } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true });
      
      const { count: remainingDocs } = await supabase
        .from('processed_documents')
        .select('*', { count: 'exact', head: true });

      console.log(`VERIFICATION RESULTS:`);
      console.log(`- Remaining Embeddings: ${remainingEmbeddings}`);
      console.log(`- Remaining Chunks: ${remainingChunks}`);
      console.log(`- Remaining Documents: ${remainingDocs}`);

      const totalRemaining = (remainingEmbeddings || 0) + (remainingChunks || 0) + (remainingDocs || 0);

      if (totalRemaining === 0) {
        console.log('✅ COMPLETE DATABASE RESET COMPLETED SUCCESSFULLY');
        toast({
          title: "Complete Database Reset Successful",
          description: `Successfully cleared the entire database`
        });
      } else {
        console.warn(`❌ WARNING: ${totalRemaining} records still remain after deletion attempt`);
        toast({
          variant: "destructive",
          title: "Partial Reset",
          description: `Deleted some records but ${totalRemaining} records remain. Check console for details.`
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
