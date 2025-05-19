
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface DocumentInfoPanelProps {
  document: {
    title: string;
    content?: string;
  } | null;
  chunksCount: number;
  onViewFullDocument: () => void;
}

export function DocumentInfoPanel({ document, chunksCount, onViewFullDocument }: DocumentInfoPanelProps) {
  return (
    <div className="p-4 border rounded-md bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{document?.title || 'Document Preview'}</h3>
        <Button variant="outline" size="sm" onClick={onViewFullDocument}>
          <Eye className="h-4 w-4 mr-2" />
          View Full Document
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-2">Generated {chunksCount} chunks</p>
    </div>
  );
}
