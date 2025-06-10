
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
  onClearDocument: (documentId: string) => void;
  isClearing: boolean;
}

interface DocumentInfo {
  id: string;
  title: string;
  embeddingCount: number;
}

export function DocumentCleanup({ embeddings, onClearDocument, isClearing }: DocumentCleanupProps) {
  const [documentsWithNames, setDocumentsWithNames] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDocumentNames = async () => {
      const uniqueDocuments = [...new Set(embeddings.map(e => e.document_id))];
      
      if (uniqueDocuments.length === 0) {
        setDocumentsWithNames([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('processed_documents')
          .select('id, title')
          .in('id', uniqueDocuments);

        if (error) {
          console.error('Error fetching document names:', error);
          // Fallback to showing just IDs if we can't fetch names
          const fallbackDocs = uniqueDocuments.map(docId => ({
            id: docId,
            title: `Document ${docId.slice(0, 8)}...`,
            embeddingCount: embeddings.filter(e => e.document_id === docId).length
          }));
          setDocumentsWithNames(fallbackDocs);
          return;
        }

        // Combine document info with embedding counts
        const docsWithInfo = (data || []).map(doc => ({
          id: doc.id,
          title: doc.title || `Document ${doc.id.slice(0, 8)}...`,
          embeddingCount: embeddings.filter(e => e.document_id === doc.id).length
        }));

        // Add any documents that weren't found in processed_documents (orphaned embeddings)
        const foundDocIds = new Set((data || []).map(d => d.id));
        const orphanedDocs = uniqueDocuments
          .filter(docId => !foundDocIds.has(docId))
          .map(docId => ({
            id: docId,
            title: `Unknown Document (${docId.slice(0, 8)}...)`,
            embeddingCount: embeddings.filter(e => e.document_id === docId).length
          }));

        setDocumentsWithNames([...docsWithInfo, ...orphanedDocs]);
      } catch (err) {
        console.error('Exception fetching document names:', err);
        // Fallback to showing just IDs
        const fallbackDocs = uniqueDocuments.map(docId => ({
          id: docId,
          title: `Document ${docId.slice(0, 8)}...`,
          embeddingCount: embeddings.filter(e => e.document_id === docId).length
        }));
        setDocumentsWithNames(fallbackDocs);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentNames();
  }, [embeddings]);

  if (documentsWithNames.length === 0 && !isLoading) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Clear Embeddings by Document:</h4>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading document names...</div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {documentsWithNames.slice(0, 10).map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" title={doc.title}>
                  {doc.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {doc.embeddingCount} embeddings • ID: {doc.id.slice(0, 8)}...
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onClearDocument(doc.id)}
                disabled={isClearing}
                className="ml-2"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {documentsWithNames.length > 10 && (
            <div className="text-xs text-muted-foreground text-center">
              Showing first 10 documents with embeddings
            </div>
          )}
        </div>
      )}
    </div>
  );
}
