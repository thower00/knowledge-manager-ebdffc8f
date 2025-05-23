
import { ProcessedDocument } from "@/types/document";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface DocumentSelectorFooterProps {
  documents: ProcessedDocument[];
  selectedDocumentIds: string[];
  extractAllDocuments: boolean;
  setExtractAllDocuments: (value: boolean) => void;
  isLoading: boolean;
  isExtracting: boolean;
  onExtract: () => void;
  currentDocumentIndex: number;
  documentsToProcessCount: number;
  selectionError?: string | null;
}

export function DocumentSelectorFooter({
  documents,
  selectedDocumentIds,
  extractAllDocuments,
  setExtractAllDocuments,
  isLoading,
  isExtracting,
  onExtract,
  currentDocumentIndex,
  documentsToProcessCount,
  selectionError
}: DocumentSelectorFooterProps) {
  // Count selected documents or all if extractAllDocuments is true
  const selectedCount = extractAllDocuments 
    ? documents.length 
    : selectedDocumentIds.length;
  
  // Generate extraction button text
  const extractButtonText = isExtracting
    ? `Extracting ${currentDocumentIndex + 1}/${documentsToProcessCount}`
    : `Extract ${selectedCount} Document${selectedCount !== 1 ? 's' : ''}`;
  
  return (
    <div className="p-4 border-t">
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="extract-all"
          checked={extractAllDocuments}
          onCheckedChange={(checked) => setExtractAllDocuments(!!checked)}
          disabled={isLoading || isExtracting}
        />
        <label
          htmlFor="extract-all"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Use all documents ({documents.length})
        </label>
      </div>
      
      {selectionError && (
        <div className="text-sm text-red-500 mb-4">
          {selectionError}
        </div>
      )}
      
      <Button
        onClick={onExtract}
        disabled={
          isLoading || 
          isExtracting || 
          (selectedDocumentIds.length === 0 && !extractAllDocuments) ||
          documents.length === 0
        }
        className="w-full"
      >
        {isExtracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {extractButtonText}
      </Button>
      
      <div className="mt-2 text-xs text-muted-foreground text-center">
        {!extractAllDocuments && selectedDocumentIds.length === 0 ? (
          "Please select at least one document"
        ) : (
          `${extractAllDocuments ? 'All' : selectedDocumentIds.length} document${
            (extractAllDocuments && documents.length !== 1) || (!extractAllDocuments && selectedDocumentIds.length !== 1) ? 's' : ''
          } selected`
        )}
      </div>
    </div>
  );
}
