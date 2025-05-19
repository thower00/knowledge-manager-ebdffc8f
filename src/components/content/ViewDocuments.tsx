
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { ProcessedDocumentStatusBadge } from "./processed-documents/ProcessedDocumentStatusBadge";
import { useProcessedDocuments } from "./processed-documents/useProcessedDocuments";

export function ViewDocuments() {
  const {
    documents,
    isLoading,
    loadProcessedDocuments,
  } = useProcessedDocuments();

  // Load documents on initial render
  useEffect(() => {
    loadProcessedDocuments();
  }, [loadProcessedDocuments]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-medium">Processed Documents</h3>
            <p className="text-sm text-muted-foreground">
              View documents that have been processed and uploaded to the database.
            </p>
          </div>
          <button
            onClick={() => loadProcessedDocuments()}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-t-blue-600 border-r-transparent border-b-blue-600 border-l-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading documents...</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-4">
            <div className="flex items-center justify-center w-12 h-12 mb-4 bg-gray-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-center">No documents found</h3>
            <p className="text-sm text-center text-muted-foreground">
              There are no processed documents in the database yet.
            </p>
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
                      <ProcessedDocumentStatusBadge status={doc.status} />
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
