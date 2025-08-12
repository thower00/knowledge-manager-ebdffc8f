
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";

import type { ProcessedDocument as SharedProcessedDocument } from "@/types/document";

type ProcessedDocument = SharedProcessedDocument & {
  content?: string;
};

interface DocumentInfoPanelProps {
  document: ProcessedDocument;
  chunksCount: number;
  onViewFullDocument: () => void;
}

export function DocumentInfoPanel({ 
  document, 
  chunksCount, 
  onViewFullDocument 
}: DocumentInfoPanelProps) {
  return (
    <div className="bg-muted/40 p-4 rounded-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            {document.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {document.mime_type} • {document.content?.length.toLocaleString() || 0} characters
          </p>
          <p className="text-sm text-muted-foreground">
            Document will be divided into <span className="font-semibold">{chunksCount}</span> chunks
          </p>
          {document.url && (
            <p className="text-xs text-muted-foreground break-all">
              <span className="font-medium">Source:</span> {document.url}
            </p>
          )}
        </div>
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center" 
            onClick={onViewFullDocument}
            disabled={!document.url}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Full Document
          </Button>
        </div>
      </div>
    </div>
  );
}
