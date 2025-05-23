
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ProcessedDocument } from "@/types/document";
import { ProcessedDocumentStatusBadge } from "@/components/content/processed-documents/ProcessedDocumentStatusBadge";
import { useEffect } from "react";

interface DocumentTableBodyProps {
  documents: ProcessedDocument[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  isLoading: boolean;
}

export function DocumentTableBody({
  documents,
  selectedDocumentIds,
  toggleDocumentSelection,
  isLoading
}: DocumentTableBodyProps) {
  // Enhanced debug logging for document selection
  useEffect(() => {
    console.log("DocumentTableBody rendered with:", {
      documentsCount: documents.length,
      selectedIds: selectedDocumentIds,
      selectedCount: selectedDocumentIds?.length || 0,
    });
  }, [documents, selectedDocumentIds]);

  // Force row class to be very visible when selected
  const getRowClass = (docId: string) => {
    const isSelected = selectedDocumentIds?.includes(docId);
    return isSelected ? "bg-primary-foreground/30 border-l-4 border-l-primary" : "";
  };

  // Handle row click for selection with improved debugging
  const handleRowClick = (docId: string) => {
    console.log("Row clicked for document:", docId);
    console.log("Before toggle - Selected IDs:", JSON.stringify(selectedDocumentIds));
    toggleDocumentSelection(docId);
    // Cannot log after state update since it's asynchronous
  };

  // Safety check for selectedDocumentIds
  const safeSelectedIds = selectedDocumentIds || [];

  return (
    <TableBody>
      {documents.map((doc) => {
        const isSelected = safeSelectedIds.includes(doc.id);
        return (
          <TableRow 
            key={doc.id} 
            className={getRowClass(doc.id)}
            onClick={() => handleRowClick(doc.id)}
            style={{ cursor: 'pointer' }}
            data-selected={isSelected}
            data-testid={`document-row-${doc.id}`}
          >
            <TableCell>
              <div onClick={(e) => {
                // Important: Stop propagation so the row click handler doesn't fire
                e.stopPropagation();
              }}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {
                    console.log("Checkbox changed for document:", doc.id);
                    toggleDocumentSelection(doc.id);
                  }}
                  data-testid={`document-checkbox-${doc.id}`}
                />
              </div>
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
        );
      })}
    </TableBody>
  );
}
