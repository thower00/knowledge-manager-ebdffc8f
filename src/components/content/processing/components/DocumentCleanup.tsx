
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface DocumentCleanupProps {
  embeddings: EmbeddingRecord[];
  onClearDocument: (documentId: string) => Promise<void>;
  isClearing: boolean;
}

export function DocumentCleanup({ embeddings, onClearDocument, isClearing }: DocumentCleanupProps) {
  const [documentNames, setDocumentNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchDocumentNames = async () => {
    if (!embeddings || embeddings.length === 0) return;

    setIsLoading(true);
    try {
      const uniqueDocIds = [...new Set(embeddings.map(e => e.document_id))];
      
      const { data, error } = await supabase
        .from('processed_documents')
        .select('id, title')
        .in('id', uniqueDocIds);

      if (error) throw error;

      const nameMap = (data || []).reduce((acc, doc) => {
        acc[doc.id] = doc.title || `Document ${doc.id.slice(0, 8)}`;
        return acc;
      }, {} as Record<string, string>);

      setDocumentNames(nameMap);
    } catch (error) {
      console.error('Error fetching document names:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load document names"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentNames();
  }, [embeddings]);

  // Get unique documents from embeddings
  const uniqueDocuments = embeddings.reduce((acc, embedding) => {
    if (!acc.find(doc => doc.document_id === embedding.document_id)) {
      acc.push({
        document_id: embedding.document_id,
        count: embeddings.filter(e => e.document_id === embedding.document_id).length
      });
    }
    return acc;
  }, [] as Array<{ document_id: string; count: number }>);

  if (uniqueDocuments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Cleanup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No documents with embeddings found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Document Cleanup</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocumentNames}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Clear embeddings for individual documents. This will remove all vector embeddings for the selected document.
        </p>
        
        <div className="space-y-2">
          {uniqueDocuments.map(doc => (
            <div key={doc.document_id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="font-medium text-sm">
                  {documentNames[doc.document_id] || `Document ${doc.document_id.slice(0, 8)}...`}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {doc.count} embeddings
                </Badge>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onClearDocument(doc.document_id)}
                disabled={isClearing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
