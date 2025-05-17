
import { ProcessedDocument } from "@/types/document";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink } from "lucide-react";
import { ProcessedDocumentStatusBadge } from "./ProcessedDocumentStatusBadge";

interface DocumentsTableProps {
  documents: ProcessedDocument[];
  selectedDocuments: string[];
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
}

export function DocumentsTable({
  documents,
  selectedDocuments,
  toggleSelection,
  toggleSelectAll
}: DocumentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox 
                checked={selectedDocuments.length === documents.length && documents.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
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
              <TableCell>
                <Checkbox
                  checked={selectedDocuments.includes(doc.id)}
                  onCheckedChange={() => toggleSelection(doc.id)}
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
  );
}
