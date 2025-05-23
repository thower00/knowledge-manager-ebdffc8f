
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CardContent } from "@/components/ui/card";
import { FileText, Loader2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { ProcessedDocument } from "@/types/document";

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
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  
  // Calculate if extract button should be enabled
  const hasSelection = selectedDocumentIds && selectedDocumentIds.length > 0;
  const canExtract = !isLoading && !isExtracting && (hasSelection || (extractAllDocuments && documents.length > 0));

  // Log state for debugging
  useEffect(() => {
    console.log("DocumentSelectorFooter state:", {
      hasSelection,
      selectedCount: selectedDocumentIds?.length || 0,
      extractAll: extractAllDocuments,
      canExtract,
      documentsCount: documents.length,
      isExtracting,
      selectionError
    });
  }, [selectedDocumentIds, extractAllDocuments, documents.length, isExtracting, canExtract, selectionError]);

  // Handle extract button click with visual feedback
  const handleExtractClick = () => {
    console.log("Extract button clicked with state:", {
      selectedIds: JSON.stringify(selectedDocumentIds),
      selectedCount: selectedDocumentIds?.length || 0,
      extractAll: extractAllDocuments,
      canExtract
    });
    
    // Add visual feedback for button click
    setIsButtonClicked(true);
    setTimeout(() => setIsButtonClicked(false), 300);
    
    // Call the extraction handler
    onExtract();
  };

  return (
    <CardContent className="p-4 border-t">
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox 
          id="extract-all" 
          checked={extractAllDocuments}
          onCheckedChange={(checked) => {
            console.log("Extract all changed to:", checked);
            setExtractAllDocuments(checked === true);
          }}
        />
        <label htmlFor="extract-all" className="text-sm cursor-pointer">
          Extract from all documents (ignores selection)
        </label>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {extractAllDocuments 
            ? `All ${documents.length} documents will be processed` 
            : `${selectedDocumentIds?.length || 0} document(s) selected`}
        </div>
        
        <Button 
          onClick={handleExtractClick}
          disabled={!canExtract}
          data-testid="extract-selected-button"
          className={isButtonClicked ? "bg-primary/80" : ""}
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {documentsToProcessCount > 1 
                ? `Extracting Document ${currentDocumentIndex + 1}/${documentsToProcessCount}...` 
                : "Extracting..."}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              {extractAllDocuments ? "Extract All" : "Extract Selected"}
            </>
          )}
        </Button>
      </div>
      
      {/* Error feedback - shown when selection validation fails */}
      {selectionError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 flex items-center text-sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span>{selectionError}</span>
        </div>
      )}
    </CardContent>
  );
}
