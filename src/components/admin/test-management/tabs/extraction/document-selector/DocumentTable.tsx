
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { ProcessedDocument } from "@/types/document";
import { ProcessedDocumentStatusBadge } from "@/components/content/processed-documents/ProcessedDocumentStatusBadge";
import { CardContent } from "@/components/ui/card";

interface DocumentTableProps {
  documents: ProcessedDocument[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  toggleSelectAll: () => void;
  isLoading: boolean;
}

export function DocumentTable({
  documents,
  selectedDocumentIds,
  toggleDocumentSelection,
  toggleSelectAll,
  isLoading
}: DocumentTableProps) {
  // Force row class to be very visible when selected
  const getRowClass = (docId: string) => {
    if (selectedDocumentIds.includes(docId)) {
      return "bg-primary-foreground/30 border-l-4 border-l-primary";
    }
    return "";
  };

  // Handle direct row click for selection
  const handleRowClick = (docId: string) => {
    console.log("Row clicked for document:", docId);
    toggleDocumentSelection(docId);
  };

  if (isLoading) {
    return (
      <CardContent className="p-0">
        <div className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </CardContent>
    );
  }

  if (documents.length === 0) {
    return (
      <CardContent className="p-0">
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-2">No documents available in the database</p>
          <p className="text-sm text-muted-foreground">
            Upload documents in the Content Management tab first
          </p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedDocumentIds.length === documents.length && documents.length > 0}
                  onCheckedChange={() => {
                    console.log("Toggle all checkbox clicked");
                    toggleSelectAll();
                  }}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Processed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow 
                key={doc.id} 
                className={getRowClass(doc.id)}
                onClick={() => handleRowClick(doc.id)}
                style={{ cursor: 'pointer' }}
                data-selected={selectedDocumentIds.includes(doc.id)}
                data-testid={`document-row-${doc.id}`}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedDocumentIds.includes(doc.id)}
                    onCheckedChange={() => {
                      console.log("Checkbox clicked for document:", doc.id);
                      toggleDocumentSelection(doc.id);
                    }}
                    data-testid={`document-checkbox-${doc.id}`}
                  />
                </TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  );
}
