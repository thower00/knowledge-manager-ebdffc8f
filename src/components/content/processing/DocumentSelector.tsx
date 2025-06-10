
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw } from "lucide-react";
import { ProcessedDocument } from "@/types/document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessedDocumentStatusBadge } from "../processed-documents/ProcessedDocumentStatusBadge";

interface DocumentSelectorProps {
  documents: ProcessedDocument[];
  selectedDocuments: string[];
  onSelectDocument: (documentId: string) => void;
  onSelectAll: (select: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function DocumentSelector({
  documents,
  selectedDocuments,
  onSelectDocument,
  onSelectAll,
  onRefresh,
  isLoading,
}: DocumentSelectorProps) {
  
  const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Selection</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Selection</CardTitle>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            No processed documents available for processing.
          </p>
          <p className="text-sm mt-2">
            Process some documents first in the Documents tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Document Selection</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 border-b bg-muted/50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Checkbox 
                checked={allSelected} 
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                id="select-all" 
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer">
                Select All ({documents.length})
              </label>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedDocuments.length} selected
            </div>
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Size</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedDocuments.includes(document.id)} 
                      onCheckedChange={() => onSelectDocument(document.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium truncate max-w-[200px]" title={document.title}>
                      {document.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {document.source_type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProcessedDocumentStatusBadge status={document.status} />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {document.size ? `${Math.round(document.size / 1024)} KB` : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {/* Preview functionality to be implemented */}}
                      title="Preview document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
