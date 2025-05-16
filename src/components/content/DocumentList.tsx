
import { Table, TableBody } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentLoadingState } from "./DocumentLoadingState";
import { DocumentEmptyState } from "./DocumentEmptyState";
import { DocumentTableHeader } from "./DocumentTableHeader";
import { DocumentTableRow } from "./DocumentTableRow";
import { DocumentFile } from "@/types/document";

interface DocumentListProps {
  documents: DocumentFile[];
  selectedDocuments: string[];
  isLoading: boolean;
  toggleSelection: (documentId: string) => void;
  toggleSelectAll: (selectAll: boolean) => void;
}

export function DocumentList({
  documents,
  selectedDocuments,
  isLoading,
  toggleSelection,
  toggleSelectAll
}: DocumentListProps) {
  if (isLoading) {
    return <DocumentLoadingState />;
  }

  if (documents.length === 0) {
    return <DocumentEmptyState />;
  }

  const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b bg-muted/50">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">{documents.length} documents found</span>
              <span className="text-sm text-muted-foreground ml-2">
                ({selectedDocuments.length} selected)
              </span>
            </div>
          </div>
        </div>
        <Table>
          <DocumentTableHeader 
            allSelected={allSelected} 
            onToggleSelectAll={toggleSelectAll}
          />
          <TableBody>
            {documents.map((document) => (
              <DocumentTableRow
                key={document.id}
                document={document}
                isSelected={selectedDocuments.includes(document.id)}
                onToggleSelection={() => toggleSelection(document.id)}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
