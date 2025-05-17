
import { useState, useEffect, useCallback } from "react";
import { ProcessedDocument } from "@/types/document";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { fetchProcessedDocuments } from "./utils/documentDbService";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function ProcessedDocumentsList() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadProcessedDocuments = useCallback(async () => {
    console.log("Loading processed documents...");
    setIsLoading(true);
    try {
      const docs = await fetchProcessedDocuments();
      console.log("Fetched processed documents:", docs);
      setDocuments(docs);
    } catch (err: any) {
      console.error("Error fetching processed documents:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load processed documents."
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load documents on initial render only
  useEffect(() => {
    loadProcessedDocuments();
    
    // No automatic refresh by default
  }, [loadProcessedDocuments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b bg-muted/50 flex justify-between items-center">
          <div>
            <div className="font-medium">Processed Documents</div>
            <div className="text-sm text-muted-foreground">
              Documents that have been processed and stored in the database
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadProcessedDocuments} 
            className="whitespace-nowrap"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
        
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No documents have been processed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Processed</TableHead>
                  <TableHead className="hidden md:table-cell">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <span className="text-xs whitespace-nowrap">{doc.mime_type}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {doc.source_type}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {doc.processed_at ? new Date(doc.processed_at).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {doc.url && (
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-500 hover:text-blue-700"
                        >
                          View <ExternalLink className="h-4 w-4 ml-1" />
                        </a>
                      )}
                      {doc.error && (
                        <span className="text-red-500" title={doc.error}>
                          Error
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
