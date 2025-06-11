
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

      // Step 1: Delete all embeddings using SQL function
      console.log('=== STEP 1: DELETING EMBEDDINGS ===');
      try {
        const { data: embeddingResult, error: embeddingError } = await supabase.rpc('sql', {
          query: 'DELETE FROM document_embeddings; SELECT 1 as success;'
        });

        if (embeddingError) {
          console.error('SQL function error for embeddings:', embeddingError);
          // Fallback to direct delete
          const { error: fallbackError, count } = await supabase
            .from('document_embeddings')
            .delete()
            .neq('id', '');
          
          if (!fallbackError) {
            deletedEmbeddings = count || 0;
          }
        } else {
          console.log('✓ Embeddings deleted via SQL function');
          deletedEmbeddings = 999; // We don't know the exact count but it worked
        }
      } catch (error) {
        console.error('Exception deleting embeddings:', error);
      }

      // Step 2: Delete all chunks using SQL function
      console.log('=== STEP 2: DELETING CHUNKS ===');
      try {
        const { data: chunkResult, error: chunkError } = await supabase.rpc('sql', {
          query: 'DELETE FROM document_chunks; SELECT 1 as success;'
        });

        if (chunkError) {
          console.error('SQL function error for chunks:', chunkError);
          // Fallback to direct delete
          const { error: fallbackError, count } = await supabase
            .from('document_chunks')
            .delete()
            .neq('id', '');
          
          if (!fallbackError) {
            deletedChunks = count || 0;
          }
        } else {
          console.log('✓ Chunks deleted via SQL function');
          deletedChunks = 999; // We don't know the exact count but it worked
        }
      } catch (error) {
        console.error('Exception deleting chunks:', error);
      }

      // Step 3: Delete all documents using SQL function
      console.log('=== STEP 3: DELETING DOCUMENTS ===');
      try {
        const { data: docResult, error: docError } = await supabase.rpc('sql', {
          query: 'DELETE FROM processed_documents; SELECT 1 as success;'
        });

        if (docError) {
          console.error('SQL function error for documents:', docError);
          
          // Fallback 1: Try direct delete without any conditions
          console.log('Trying direct delete for documents...');
          const { error: directError, count: directCount } = await supabase
            .from('processed_documents')
            .delete()
            .neq('id', '');

          if (directError) {
            console.error('Direct delete failed:', directError);
            
            // Fallback 2: Delete individual documents
            console.log('Trying individual document deletion...');
            if (documents && documents.length > 0) {
              for (const doc of documents) {
                try {
                  const { error: individualError } = await supabase
                    .from('processed_documents')
                    .delete()
                    .eq('id', doc.id);

                  if (individualError) {
                    console.error(`Failed to delete document ${doc.title}:`, individualError);
                  } else {
                    deletedDocs++;
                    console.log(`✓ Successfully deleted document: ${doc.title}`);
                  }
                } catch (error) {
                  console.error(`Exception deleting document ${doc.title}:`, error);
                }
              }
            }
          } else {
            deletedDocs = directCount || 0;
            console.log(`✓ Direct delete succeeded: ${deletedDocs} documents`);
          }
        } else {
          console.log('✓ Documents deleted via SQL function');
          deletedDocs = documents?.length || 999; // Use known count or assume success
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
