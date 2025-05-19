
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, Loader2 } from "lucide-react";
import { ProcessedDocument } from "@/types/document";

interface DocumentSelectorProps {
  documents: ProcessedDocument[] | undefined;
  selectedDocumentId: string;
  setSelectedDocumentId: (id: string) => void;
  isLoading: boolean;
  isExtracting: boolean;
  onExtractClick: () => void;
  isProxyAvailable: boolean;
  isCheckingConnection: boolean;
  storeInDatabase?: boolean;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  documents,
  selectedDocumentId,
  setSelectedDocumentId,
  isLoading,
  isExtracting,
  onExtractClick,
  isProxyAvailable,
  isCheckingConnection,
  storeInDatabase = false,
}) => {
  // Determine if the extract button should be enabled
  // Allow extracting if either proxy is available OR store in database is enabled
  const canExtract = selectedDocumentId && !isExtracting && (isProxyAvailable || storeInDatabase || isCheckingConnection);

  return (
    <div className="space-y-4">
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
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          {isCheckingConnection && (
            <div className="flex items-center text-sm text-amber-600">
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              <span>Checking proxy connection...</span>
            </div>
          )}
          
          {!isCheckingConnection && !isProxyAvailable && !storeInDatabase && (
            <div className="flex items-center text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Proxy service unavailable</span>
            </div>
          )}
          
          {!isCheckingConnection && !isProxyAvailable && storeInDatabase && (
            <div className="flex items-center text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Proxy unavailable, using database storage</span>
            </div>
          )}
        </div>
        
        <Button
          onClick={onExtractClick}
          disabled={!canExtract}
          className="w-full sm:w-auto"
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Extract Text
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
