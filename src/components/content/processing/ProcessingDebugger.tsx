
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
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
  const { toast } = useToast();

  const checkDocumentStatus = async () => {
    setIsLoading(true);
    try {
      console.log('Checking document processing status...');
      
      // Get all processed documents
      const { data: docs, error: docsError } = await supabase
        .from('processed_documents')
        .select('id, title, status')
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      const documentStatuses: DocumentStatus[] = [];

      for (const doc of docs || []) {
        // Count chunks
        const { count: chunksCount } = await supabase
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id);

        // Count embeddings
        const { count: embeddingsCount } = await supabase
          .from('document_embeddings')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id);

        // Check if chunks have content
        const { data: sampleChunk } = await supabase
          .from('document_chunks')
          .select('content')
          .eq('document_id', doc.id)
          .limit(1)
          .single();

        documentStatuses.push({
          id: doc.id,
          title: doc.title,
          status: doc.status,
          chunksCount: chunksCount || 0,
          embeddingsCount: embeddingsCount || 0,
          hasContent: !!(sampleChunk?.content && sampleChunk.content.trim().length > 0)
        });
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

  const clearCompleteDatabase = async () => {
    setIsClearing(true);
    try {
      console.log('Starting complete database reset...');
      
      // Delete embeddings first (due to foreign key constraints)
      const { error: embeddingsError } = await supabase
        .from('document_embeddings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (embeddingsError) throw embeddingsError;
      console.log('All embeddings deleted');

      // Delete chunks
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (chunksError) throw chunksError;
      console.log('All chunks deleted');

      // Delete processed documents
      const { error: docsError } = await supabase
        .from('processed_documents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (docsError) throw docsError;
      console.log('All processed documents deleted');

      toast({
        title: "Database Reset Complete",
        description: "All processed documents, chunks, and embeddings have been cleared from the database"
      });

      // Refresh the status to show empty database
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
          processed_at: null
        })
        .eq('id', documentId);
      
      if (statusError) throw statusError;

      toast({
        title: "Document reset",
        description: `"${title}" has been reset and can be reprocessed`
      });

      // Refresh the status
      checkDocumentStatus();
      
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Processing Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={checkDocumentStatus} 
            disabled={isLoading || isClearing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isLoading || isClearing || documents.length === 0}
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
                Use the reset button to clear their data and reprocess them, or use "Clear Complete Database" to start fresh.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
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
