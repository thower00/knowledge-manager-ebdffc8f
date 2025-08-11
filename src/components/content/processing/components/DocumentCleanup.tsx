
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
    console.log("DocumentCleanup: Fetching document names for embeddings:", embeddings?.length || 0);
    
    if (!embeddings || embeddings.length === 0) {
      console.log("DocumentCleanup: No embeddings provided");
      return;
    }

    setIsLoading(true);
    try {
      const uniqueDocIds = [...new Set(embeddings.map(e => e.document_id))];
      console.log("DocumentCleanup: Unique document IDs found:", uniqueDocIds);
      
      const { data, error } = await supabase
        .from('processed_documents')
        .select('id, title')
        .in('id', uniqueDocIds);

      if (error) {
        console.error("DocumentCleanup: Error fetching document names:", error);
        throw error;
      }

      console.log("DocumentCleanup: Fetched documents from DB:", data);

      const nameMap = (data || []).reduce((acc, doc) => {
        acc[doc.id] = doc.title || `Document ${doc.id.slice(0, 8)}`;
        return acc;
      }, {} as Record<string, string>);

      console.log("DocumentCleanup: Name map created:", nameMap);
      setDocumentNames(nameMap);
    } catch (error) {
      console.error('DocumentCleanup: Error fetching document names:', error);
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

  // Get unique documents from embeddings with better logic
  const uniqueDocuments = React.useMemo(() => {
    if (!embeddings || embeddings.length === 0) {
      console.log("DocumentCleanup: No embeddings to process");
      return [];
    }

    const documentMap = new Map<string, { document_id: string; count: number }>();
    
    embeddings.forEach(embedding => {
      const existing = documentMap.get(embedding.document_id);
      if (existing) {
        existing.count += 1;
      } else {
        documentMap.set(embedding.document_id, {
          document_id: embedding.document_id,
          count: 1
        });
      }
    });

    const result = Array.from(documentMap.values());
    console.log("DocumentCleanup: Unique documents calculated:", result);
    return result;
  }, [embeddings]);

  console.log("DocumentCleanup: Rendering with", uniqueDocuments.length, "unique documents");

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
                <Badge variant="outline" className="text-xs">
                  ID: {doc.document_id.slice(0, 8)}...
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
