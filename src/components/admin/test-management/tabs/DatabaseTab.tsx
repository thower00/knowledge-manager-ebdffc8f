import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Settings
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

interface DatabaseStats {
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  documentsWithIssues: number;
  providers: string[];
  models: string[];
}

interface DatabaseTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
}

export function DatabaseTab({ isLoading, onRunTest }: DatabaseTabProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const loadDatabaseStats = async () => {
    setIsLoadingStats(true);
    try {
      console.log('Loading database statistics...');
      
      // Get document count
      const { count: docCount } = await supabase
        .from('processed_documents')
        .select('*', { count: 'exact', head: true });

      // Get chunk count
      const { count: chunkCount } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true });

      // Get embedding count
      const { count: embeddingCount } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true });

      // Get provider and model information
      const { data: embeddingData } = await supabase
        .from('document_embeddings')
        .select('embedding_provider, embedding_model')
        .order('created_at', { ascending: false })
        .limit(100);

      const providers = [...new Set(embeddingData?.map(e => e.embedding_provider) || [])];
      const models = [...new Set(embeddingData?.map(e => e.embedding_model) || [])];

      // Count documents with issues (completed but no chunks/embeddings)
      const { data: docs } = await supabase
        .from('processed_documents')
        .select('id, status')
        .eq('status', 'completed');

      let documentsWithIssues = 0;
      if (docs) {
        for (const doc of docs) {
          const { count: docChunkCount } = await supabase
            .from('document_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', doc.id);

          const { count: docEmbeddingCount } = await supabase
            .from('document_embeddings')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', doc.id);

          if ((docChunkCount || 0) === 0 || (docEmbeddingCount || 0) === 0) {
            documentsWithIssues++;
          }
        }
      }

      const statsData: DatabaseStats = {
        totalDocuments: docCount || 0,
        totalChunks: chunkCount || 0,
        totalEmbeddings: embeddingCount || 0,
        documentsWithIssues,
        providers,
        models
      };

      setStats(statsData);
      
      const result = {
        status: 'success',
        message: 'Database statistics loaded successfully',
        stats: statsData
      };
      
      onRunTest(result);
      
      console.log('Database statistics loaded:', statsData);
      
    } catch (error) {
      console.error('Error loading database statistics:', error);
      
      const result = {
        status: 'error',
        message: 'Failed to load database statistics',
        error: error instanceof Error ? error.message : String(error)
      };
      
      onRunTest(result);
      
      toast({
        variant: "destructive",
        title: "Error loading stats",
        description: result.error
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const clearAllData = async () => {
    setIsClearing(true);
    try {
      console.log('Starting complete database reset...');
      
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

      // Use a more aggressive deletion approach - delete everything by not filtering
      console.log('Deleting all embeddings...');
      const { error: embeddingsError } = await supabase
        .from('document_embeddings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // This will match all UUIDs

      if (embeddingsError) {
        console.error('Error deleting embeddings:', embeddingsError);
        throw new Error(`Failed to delete embeddings: ${embeddingsError.message}`);
      }

      console.log('Deleting all chunks...');
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (chunksError) {
        console.error('Error deleting chunks:', chunksError);
        throw new Error(`Failed to delete chunks: ${chunksError.message}`);
      }

      console.log('Deleting all processed documents...');
      const { error: docsError } = await supabase
        .from('processed_documents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (docsError) {
        console.error('Error deleting documents:', docsError);
        throw new Error(`Failed to delete documents: ${docsError.message}`);
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
        
        // Reset stats to reflect empty database
        setStats({
          totalDocuments: 0,
          totalChunks: 0,
          totalEmbeddings: 0,
          documentsWithIssues: 0,
          providers: [],
          models: []
        });

        const result = {
          status: 'success',
          message: 'Database cleared successfully',
          deletedDocuments: initialDocs || 0,
          deletedChunks: initialChunks || 0,
          deletedEmbeddings: initialEmbeddings || 0
        };
        
        onRunTest(result);

        toast({
          title: "Database Reset Complete",
          description: `Successfully cleared all data from the database`
        });
      } else {
        console.warn(`Warning: Some records remain - Embeddings: ${remainingEmbeddings}, Chunks: ${remainingChunks}, Documents: ${remainingDocs}`);
        
        const result = {
          status: 'warning',
          message: 'Partial database reset',
          remainingEmbeddings,
          remainingChunks,
          remainingDocs
        };
        
        onRunTest(result);

        toast({
          variant: "destructive",
          title: "Partial Reset",
          description: `Some records may remain. Check console for details.`
        });
      }
      
      // Reload stats to show current database state
      await loadDatabaseStats();
      
    } catch (error) {
      console.error('Error clearing database:', error);
      
      const result = {
        status: 'error',
        message: 'Database reset failed',
        error: error instanceof Error ? error.message : String(error)
      };
      
      onRunTest(result);
      
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: result.error
      });
    } finally {
      setIsClearing(false);
    }
  };

  const clearFailedDocuments = async () => {
    try {
      console.log('Clearing failed documents...');
      
      // Get documents marked as completed but with no chunks/embeddings
      const { data: docs } = await supabase
        .from('processed_documents')
        .select('id, title, status')
        .eq('status', 'completed');

      let clearedCount = 0;
      if (docs) {
        for (const doc of docs) {
          const { count: docChunkCount } = await supabase
            .from('document_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', doc.id);

          const { count: docEmbeddingCount } = await supabase
            .from('document_embeddings')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', doc.id);

          if ((docChunkCount || 0) === 0 || (docEmbeddingCount || 0) === 0) {
            // Delete embeddings for this document
            await supabase
              .from('document_embeddings')
              .delete()
              .eq('document_id', doc.id);

            // Delete chunks for this document
            await supabase
              .from('document_chunks')
              .delete()
              .eq('document_id', doc.id);

            // Reset document status
            await supabase
              .from('processed_documents')
              .update({ 
                status: 'pending',
                processed_at: null
              })
              .eq('id', doc.id);

            clearedCount++;
          }
        }
      }

      const result = {
        status: 'success',
        message: `Cleared ${clearedCount} failed documents`,
        clearedDocuments: clearedCount
      };
      
      onRunTest(result);

      toast({
        title: "Failed Documents Cleared",
        description: `${clearedCount} documents have been reset and can be reprocessed`
      });

      // Refresh stats
      loadDatabaseStats();
      
    } catch (error) {
      console.error('Error clearing failed documents:', error);
      
      const result = {
        status: 'error',
        message: 'Failed to clear failed documents',
        error: error instanceof Error ? error.message : String(error)
      };
      
      onRunTest(result);
      
      toast({
        variant: "destructive",
        title: "Clear failed",
        description: result.error
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Database Management & Statistics</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadDatabaseStats}
              disabled={isLoadingStats || isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
              Load Database Stats
            </Button>
            
            {stats && stats.documentsWithIssues > 0 && (
              <Button
                onClick={clearFailedDocuments}
                disabled={isClearing || isLoading}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Clear Failed Documents ({stats.documentsWithIssues})
              </Button>
            )}
            
            {stats && stats.totalDocuments > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={isClearing || isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Clear All Database Data
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ALL {stats?.totalDocuments} documents, {stats?.totalChunks} chunks, 
                      and {stats?.totalEmbeddings} embeddings from the database. This action cannot be undone.
                      
                      Are you absolutely sure you want to proceed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearAllData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isClearing}
                    >
                      {isClearing ? 'Clearing...' : 'Yes, Clear Everything'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <Separator />

          {/* Database Statistics */}
          {stats && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Database Statistics
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                  <div className="text-sm text-muted-foreground">Documents</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{stats.totalChunks}</div>
                  <div className="text-sm text-muted-foreground">Chunks</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{stats.totalEmbeddings}</div>
                  <div className="text-sm text-muted-foreground">Embeddings</div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-red-600">{stats.documentsWithIssues}</div>
                  <div className="text-sm text-muted-foreground">Failed Docs</div>
                </div>
              </div>

              {/* Provider and Model Information */}
              {stats.providers.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Embedding Providers:</h4>
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

              {/* Health Status */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {stats.documentsWithIssues === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">Database Health Status</span>
                </div>
                {stats.documentsWithIssues === 0 ? (
                  <p className="text-sm text-green-600">
                    All documents have been processed successfully with chunks and embeddings.
                  </p>
                ) : (
                  <p className="text-sm text-yellow-600">
                    {stats.documentsWithIssues} document(s) are marked as completed but have no chunks or embeddings. 
                    Consider using "Clear Failed Documents" to reset them for reprocessing.
                  </p>
                )}
              </div>
            </div>
          )}

          {!stats && !isLoadingStats && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Load Database Stats" to view database information</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
