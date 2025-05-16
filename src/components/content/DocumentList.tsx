
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentFile } from "./DocumentsTab";

interface DocumentListProps {
  documents: DocumentFile[];
  selectedDocuments: string[];
  isLoading: boolean;
  toggleSelection: (documentId: string) => void;
}

export function DocumentList({
  documents,
  selectedDocuments,
  isLoading,
  toggleSelection
}: DocumentListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading documents...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-10">
            <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
            <p className="mt-4 text-sm text-muted-foreground">
              No documents found. Click "Refresh Documents" to load files from the selected source.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={documents.length > 0 && selectedDocuments.length === documents.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedDocuments(documents.map(doc => doc.id));
                    } else {
                      setSelectedDocuments([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Document Name</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Size</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedDocuments.includes(document.id)}
                    onCheckedChange={() => toggleSelection(document.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[200px] md:max-w-[300px] lg:max-w-full">
                      {document.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDocType(document.mimeType)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {document.size ? formatFileSize(document.size) : "N/A"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {document.createdTime ? new Date(document.createdTime).toLocaleDateString() : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Helper functions for formatting
function formatDocType(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word')) return 'Word';
  if (mimeType.includes('sheet')) return 'Spreadsheet';
  if (mimeType.includes('presentation')) return 'Presentation';
  if (mimeType.includes('text')) return 'Text';
  return mimeType.split('/')[1] || mimeType;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
