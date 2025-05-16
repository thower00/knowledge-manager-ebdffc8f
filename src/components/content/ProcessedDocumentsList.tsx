
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { fetchProcessedDocuments } from "./documentUtils";
import { useToast } from "@/components/ui/use-toast";

export function ProcessedDocumentsList() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadProcessedDocuments = async () => {
      setIsLoading(true);
      try {
        const docs = await fetchProcessedDocuments();
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
    };

    loadProcessedDocuments();
  }, [toast]);

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading processed documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!documents.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center p-8 text-muted-foreground">
            No documents have been processed yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b bg-muted/50">
          <div className="font-medium">Processed Documents</div>
          <div className="text-sm text-muted-foreground">
            Documents that have been processed and stored in the database
          </div>
        </div>
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
      </CardContent>
    </Card>
  );
}
