
import { ProcessedDocument } from "@/types/document";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface DocumentListProps {
  documents: ProcessedDocument[];
  isLoading: boolean;
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  toggleSelectAll: () => void;
  disabled?: boolean;
}

export function DocumentList({
  documents,
  isLoading,
  selectedDocumentIds,
  toggleDocumentSelection,
  toggleSelectAll,
  disabled = false
}: DocumentListProps) {
  // Calculate if all documents are selected
  const allSelected = 
    documents.length > 0 && 
    documents.every(doc => selectedDocumentIds.includes(doc.id));
  
  // Calculate if some documents are selected
  const someSelected = 
    selectedDocumentIds.length > 0 && 
    selectedDocumentIds.length < documents.length;
  
  // Handle document selection
  const handleToggleDocument = (documentId: string) => {
    if (!disabled) {
      toggleDocumentSelection(documentId);
    }
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox 
                checked={allSelected} 
                className="ml-2"
                onCheckedChange={toggleSelectAll}
                disabled={disabled || isLoading || documents.length === 0}
                aria-label="Select all documents"
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden md:table-cell">Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading documents...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                No documents found
              </TableCell>
            </TableRow>
          ) : (
            documents.map((document) => (
              <TableRow 
                key={document.id}
                className={selectedDocumentIds.includes(document.id) ? "bg-muted/50" : undefined}
              >
                <TableCell className="pl-4">
                  <Checkbox 
                    checked={selectedDocumentIds.includes(document.id)} 
                    onCheckedChange={() => handleToggleDocument(document.id)}
                    disabled={disabled}
                    aria-label={`Select ${document.title}`}
                  />
                </TableCell>
                <TableCell className="font-medium cursor-pointer" onClick={() => handleToggleDocument(document.id)}>
                  {document.title}
                </TableCell>
                <TableCell className="hidden md:table-cell">{document.source_type || "Unknown"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {document.created_at 
                    ? new Date(document.created_at).toLocaleDateString() 
                    : "Unknown"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
