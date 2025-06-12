
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { createClient } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { syncDocumentStatuses } from "../utils/statusSyncService";
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, Database } from "lucide-react";
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

interface DocumentStatus {
  id: string;
  title: string;
  status: string;
  chunksCount: number;
  embeddingsCount: number;
  hasContent: boolean;
}

export function ProcessingDebugger() {
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render key
  const { toast } = useToast();

  const checkDocumentStatus = async (forceFresh = false) => {
    setIsLoading(true);
    try {
      console.log('Checking document processing status...', { forceFresh, refreshKey });
      
      // Always use a completely fresh client with timestamp to bypass all caching
      const timestamp = Date.now();
      const freshClient = createClient(
        'https://sxrinuxxlmytddymjbmr.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0',
        {
          db: {
            schema: 'public'
          },
          global: {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Timestamp': timestamp.toString()
            }
          }
        }
      );
      
      if (forceFresh) {
        console.log('Force fresh enabled - waiting 3 seconds for database consistency...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Get all processed documents with aggressive cache busting
      const { data: docs, error: docsError } = await freshClient
        .from('processed_documents')
        .select('id, title, status')
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      console.log(`Found ${docs?.length || 0} documents in database at timestamp ${timestamp}`);
      const documentStatuses: DocumentStatus[] = [];

      for (const doc of docs || []) {
        console.log(`Processing status check for document: ${doc.title} (${doc.id}) - Current status: ${doc.status}`);
        
        // Count chunks
        const { count: chunksCount, error: chunksError } = await freshClient
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id);

        if (chunksError) {
          console.error(`Error counting chunks for ${doc.title}:`, chunksError);
        }

        // Count embeddings
        const { count: embeddingsCount, error: embeddingsError } = await freshClient
          .from('document_embeddings')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id);

        if (embeddingsError) {
          console.error(`Error counting embeddings for ${doc.title}:`, embeddingsError);
        }

        // Check if chunks have content
        const { data: sampleChunk, error: contentError } = await freshClient
          .from('document_chunks')
          .select('content')
          .eq('document_id', doc.id)
          .limit(1)
          .maybeSingle();

        if (contentError) {
          console.error(`Error checking content for ${doc.title}:`, contentError);
        }

        const docStatus = {
          id: doc.id,
          title: doc.title,
          status: doc.status,
          chunksCount: chunksCount || 0,
          embeddingsCount: embeddingsCount || 0,
          hasContent: !!(sampleChunk?.content && sampleChunk.content.trim().length > 0)
        };

        console.log(`Document status for "${doc.title}":`, docStatus);
        documentStatuses.push(docStatus);
      }

      setDocuments(documentStatuses);
      console.log('Document status check completed:', documentStatuses);
      
    } catch (error) {
      console.error('Error checking document status:', error);
      toast({
        variant: "destructive",
        title: "Error checking status",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncStatuses = async () => {
    setIsSyncing(true);
    try {
      console.log('Starting manual status sync...');
      const result = await syncDocumentStatuses();
      
      toast({
        title: "Status Sync Complete",
        description: `Updated ${result.updated} out of ${result.total} documents`
      });
      
      console.log(`Sync completed: ${result.updated} documents updated`);
      
      // Force complete UI refresh with new key
      console.log('Forcing complete UI refresh...');
      setRefreshKey(prev => prev + 1);
      setDocuments([]); // Clear current data
      
      // Wait longer for database changes to propagate
      console.log('Waiting 5 seconds for database changes to propagate...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Multiple fresh data fetches with delays
      console.log('First refresh attempt...');
      await checkDocumentStatus(true);
      
      setTimeout(async () => {
        console.log('Second refresh attempt...');
        setRefreshKey(prev => prev + 1);
        await checkDocumentStatus(true);
      }, 3000);
      
      setTimeout(async () => {
        console.log('Final refresh attempt...');
        setRefreshKey(prev => prev + 1);
        await checkDocumentStatus(true);
      }, 6000);
      
    } catch (error) {
      console.error('Error syncing document statuses:', error);
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const clearCompleteDatabase = async () => {
    setIsClearing(true);
    try {
      console.log('Starting complete database reset...');
      
      // Delete embeddings first (due to foreign key constraints)
      const { error: embeddingsError } = await supabase
        .from('document_embeddings')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');
      
      if (embeddingsError) throw embeddingsError;
      console.log('All embeddings deleted');

      // Delete chunks
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');
      
      if (chunksError) throw chunksError;
      console.log('All chunks deleted');

      // Delete processed documents
      const { error: docsError } = await supabase
        .from('processed_documents')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');
      
      if (docsError) throw docsError;
      console.log('All processed documents deleted');

      toast({
        title: "Database Reset Complete",
        description: "All processed documents, chunks, and embeddings have been cleared from the database"
      });

      // Refresh the status to show empty database
      setRefreshKey(prev => prev + 1);
      await checkDocumentStatus();
      
    } catch (error) {
      console.error('Error clearing database:', error);
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsClearing(false);
    }
  };

  const resetDocument = async (documentId: string, title: string) => {
    try {
      console.log(`Resetting document ${documentId} (${title})`);
      
      // Delete embeddings
      const { error: embeddingsError } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);
      
      if (embeddingsError) throw embeddingsError;

      // Delete chunks
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);
      
      if (chunksError) throw chunksError;

      // Reset document status
      const { error: statusError } = await supabase
        .from('processed_documents')
        .update({ 
          status: 'pending',
          processed_at: null,
          error: null
        })
        .eq('id', documentId);
      
      if (statusError) throw statusError;

      toast({
        title: "Document reset",
        description: `"${title}" has been reset and can be reprocessed`
      });

      // Refresh the status
      setRefreshKey(prev => prev + 1);
      await checkDocumentStatus();
      
    } catch (error) {
      console.error(`Error resetting document ${documentId}:`, error);
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const getStatusColor = (doc: DocumentStatus) => {
    if (doc.status === 'completed' && doc.chunksCount > 0 && doc.embeddingsCount > 0) {
      return "bg-green-500";
    } else if (doc.status === 'completed' && (doc.chunksCount === 0 || doc.embeddingsCount === 0)) {
      return "bg-yellow-500";
    } else if (doc.status === 'failed') {
      return "bg-red-500";
    } else {
      return "bg-blue-500";
    }
  };

  const getStatusIcon = (doc: DocumentStatus) => {
    if (doc.status === 'completed' && doc.chunksCount > 0 && doc.embeddingsCount > 0) {
      return <CheckCircle className="h-4 w-4" />;
    } else if (doc.status === 'completed' && (doc.chunksCount === 0 || doc.embeddingsCount === 0)) {
      return <AlertTriangle className="h-4 w-4" />;
    } else {
      return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Card key={refreshKey}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Processing Debugger {refreshKey > 0 && <span className="text-sm text-muted-foreground">(Refresh: {refreshKey})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => checkDocumentStatus(true)} 
            disabled={isLoading || isClearing || isSyncing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Force Fresh Check
          </Button>
          
          <Button
            onClick={syncStatuses}
            disabled={isLoading || isClearing || isSyncing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Statuses
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isLoading || isClearing || isSyncing}
              >
                <Database className="h-4 w-4 mr-2" />
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
                  This will permanently delete ALL processed documents, chunks, and embeddings from the database. 
                  This action cannot be undone. You will need to re-upload and reprocess all documents from scratch.
                  
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
        </div>

        {documents.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Document Processing Status ({documents.length} documents)</h4>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Documents marked as "completed" but with 0 chunks/embeddings indicate processing failures.
                Use "Sync Statuses" to automatically fix status mismatches, or use the reset button to clear their data and reprocess them.
                <br />
                <strong>Debug tip:</strong> Check the browser console for detailed sync information. Refresh key: {refreshKey}
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              {documents.map((doc) => (
                <div key={`${doc.id}-${refreshKey}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{doc.title}</span>
                      <Badge 
                        variant="secondary" 
                        className={`${getStatusColor(doc)} text-white`}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(doc)}
                          {doc.status}
                        </span>
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Chunks: {doc.chunksCount} | Embeddings: {doc.embeddingsCount} | 
                      Content: {doc.hasContent ? 'Yes' : 'No'}
                    </div>
                  </div>
                  
                  {(doc.status === 'completed' && (doc.chunksCount === 0 || doc.embeddingsCount === 0)) || 
                   doc.status === 'failed' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetDocument(doc.id, doc.title)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No processed documents found. The database appears to be clean.</p>
            <p className="text-sm mt-2">Upload and process some documents to see them here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
