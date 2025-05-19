
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcessedDocument } from "@/types/document";

interface DocumentSelectorProps {
  documents: ProcessedDocument[] | undefined;
  selectedDocumentId: string;
  setSelectedDocumentId: (id: string) => void;
  isLoading: boolean;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  documents,
  selectedDocumentId,
  setSelectedDocumentId,
  isLoading,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="document-select">Select Document</Label>
      <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
        <SelectTrigger id="document-select" className="w-full">
          <SelectValue placeholder="Select a document" />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Loading documents...
            </SelectItem>
          ) : documents && documents.length > 0 ? (
            documents.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                {doc.title}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-docs" disabled>
              No documents available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
