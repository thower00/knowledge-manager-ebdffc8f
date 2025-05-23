
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ProcessedDocument } from "@/types/document";

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
  disabled
}: DocumentListProps) {
  // Handle document selection click with improved event handling
  const handleDocumentClick = (documentId: string, event: React.MouseEvent) => {
    // Stop event propagation to prevent double-toggling when clicking on the checkbox directly
    event.stopPropagation();
    console.log("Document item clicked:", documentId);
    toggleDocumentSelection(documentId);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!documents || documents.length === 0) {
    return (
      <div className="py-6 text-center border rounded-md bg-gray-100">
        <p className="text-muted-foreground">No documents available in the database</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents in the Documents tab first
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="select-all" 
            checked={selectedDocumentIds.length === documents.length && documents.length > 0}
            onCheckedChange={() => toggleSelectAll()}
            disabled={disabled}
          />
          <Label htmlFor="select-all" className="cursor-pointer">Select All Documents</Label>
        </div>
        <span className="text-sm text-muted-foreground">
          {selectedDocumentIds.length} of {documents.length} selected
        </span>
      </div>
      
      <div className="max-h-60 overflow-auto border rounded-md">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className={`flex items-center space-x-2 p-2 rounded-md ${
                  selectedDocumentIds.includes(doc.id) ? 'bg-blue-50' : 'hover:bg-gray-100'
                }`}
                onClick={(e) => handleDocumentClick(doc.id, e)}
              >
                <Checkbox 
                  id={`doc-${doc.id}`} 
                  checked={selectedDocumentIds.includes(doc.id)}
                  onCheckedChange={() => toggleDocumentSelection(doc.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                  disabled={disabled}
                />
                <div className="flex-grow cursor-pointer">
                  <Label htmlFor={`doc-${doc.id}`} className="cursor-pointer">{doc.title}</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <Badge variant="outline" className="text-xs font-normal">
                      {doc.mime_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
